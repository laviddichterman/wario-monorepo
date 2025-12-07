
import { chunk } from 'es-toolkit/compat';
import type { Model } from 'mongoose';
import type { PinoLogger } from 'nestjs-pino';
import type { CatalogIdMapping, CatalogObject } from 'square';

import {
  type AbstractExpressionModifierPlacementExpression,
  FindHasAnyModifierExpressionsForMTID,
  FindModifierPlacementExpressionsForMTID,
  type ICatalog,
  type IOption,
  type IOptionType,
  type IOptionTypeDisplayFlags,
  type IProductInstanceFunction,
  type KeyValue,
} from '@wcp/wario-shared';

import { IsSetOfUniqueStrings } from '../../utils/utils';
import type { AppConfigService } from '../app-config.service';
import type { DataProviderService } from '../data-provider/data-provider.service';
import {
  GetNonSquareExternalIds,
  GetSquareExternalIds,
  GetSquareIdIndexFromExternalIds,
  IdMappingsToExternalIds,
  ModifierTypeToSquareCatalogObject,
} from '../square-wario-bridge';
import type { SquareService } from '../square/square.service';

import {
  LocationsConsidering3pFlag,
  type UncommitedOption,
  type UpdateModifierOptionProps,
  type UpdateModifierTypeProps,
} from './catalog.types';

export type { UncommitedOption, UpdateModifierOptionProps, UpdateModifierTypeProps };

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface ModifierDeps {
  wOptionTypeModel: Model<IOptionType>;
  wOptionModel: Model<IOption>;
  logger: PinoLogger;
  squareService: SquareService;
  dataProviderService: DataProviderService;
  appConfig: AppConfigService;

  // State
  catalog: ICatalog; // For reading modifiers/options
  modifierTypes: IOptionType[];
  modifierOptions: IOption[];
  productInstanceFunctions: Record<string, IProductInstanceFunction>;

  // Callbacks
  syncModifierTypes: () => Promise<boolean>;
  syncOptions: () => Promise<boolean>;
  syncProductInstances: () => Promise<boolean>;
  recomputeCatalog: () => void;
  batchDeleteCatalogObjectsFromExternalIds: (ids: KeyValue[]) => Promise<unknown>;
  updateProductsReferencingModifierTypeId: (ids: string[]) => Promise<unknown>;
  updateProductInstancesForOptionChanges: (ids: string[]) => Promise<unknown>;
  removeModifierTypeFromProducts: (mt_id: string) => Promise<unknown>;
  removeModifierOptionFromProductInstances: (modifierTypeId: string, mo_id: string) => Promise<unknown>;
  deleteProductInstanceFunction: (pifId: string, suppressRecompute: boolean) => Promise<unknown>;
}

// ============================================================================
// Helpers
// ============================================================================

const getLocationsConsidering3pFlag = (deps: ModifierDeps, is3p: boolean) =>
  LocationsConsidering3pFlag(
    is3p,
    deps.dataProviderService.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
    deps.dataProviderService.KeyValueConfig.SQUARE_LOCATION,
    deps.dataProviderService.KeyValueConfig.SQUARE_LOCATION_3P,
  );

export const validateOption = (modifierType: Pick<IOptionType, 'max_selected'>, modifierOption: Partial<UncommitedOption>) => {
  if (modifierType.max_selected === 1) {
    return !modifierOption.metadata || (!modifierOption.metadata.allowOTS && !modifierOption.metadata.can_split);
  }
  return true;
};

// ============================================================================
// Operations
// ============================================================================

export const createModifierType = async (deps: ModifierDeps, modifierType: Omit<IOptionType, 'id'>, options: UncommitedOption[]) => {
  // validate options
  options.forEach((opt) => {
    if (!validateOption(modifierType, opt)) {
      throw Error('Failed validation on modifier option in a single select modifier type');
    }
  });
  const doc = new deps.wOptionTypeModel({
    ...modifierType,
    externalIDs: GetNonSquareExternalIds(modifierType.externalIDs),
  });
  await doc.save();
  const modifierTypeId = doc.id as string;
  await deps.syncModifierTypes();
  if (options.length > 0) {
    // we need to filter these external IDs because it'll interfere with adding the new modifier to the catalog
    const adjustedOptions: Omit<IOption, 'id'>[] = options
      .map((opt) => ({
        ...opt,
        modifierTypeId,
        externalIDs: GetNonSquareExternalIds(opt.externalIDs),
      }))
      .sort((a, b) => a.ordinal - b.ordinal);
    const optionDocuments = adjustedOptions.map((x) => new deps.wOptionModel(x));
    // add the new option to the db, sync and recompute the catalog, then use UpdateModifierType to clean up
    await deps.wOptionModel.bulkWrite(
      optionDocuments.map((o) => ({
        insertOne: {
          document: o,
        },
      })),
    );
    await deps.syncOptions();
    deps.recomputeCatalog();
    await updateModifierType(deps, { id: modifierTypeId, modifierType: {} });
  }
  deps.recomputeCatalog();
  return doc.toObject();
};

export const batchUpdateModifierType = async (
  deps: ModifierDeps,
  batches: UpdateModifierTypeProps[],
  suppressFullRecomputation: boolean,
  updateModifierOptionsAndProducts: boolean,
): Promise<(IOptionType | null)[]> => {
  deps.logger.debug(
    {
      batches: batches.map((x) => ({ id: x.id, changes: x.modifierType })),
    },
    'Updating modifier type(s)',
  );

  const batchData = batches.map((b) => {
    const oldMT = deps.modifierTypes.find((x) => x.id === b.id) as IOptionType;
    return {
      batch: b,
      oldMT,
      updatedModifierType: { ...oldMT, ...b.modifierType },
      updatedOptions: deps.modifierOptions
        .filter((o) => o.modifierTypeId === b.id)
        .map((o) => ({ ...o, ...(b.modifierType.displayFlags as IOptionTypeDisplayFlags) })),
      updateModifierOptionsAndProducts,
    };
  });

  const existingSquareExternalIds: string[] = [];
  batchData.forEach((b) => {
    existingSquareExternalIds.push(...GetSquareExternalIds(b.oldMT.externalIDs).map((x) => x.value));
    existingSquareExternalIds.push(
      ...b.updatedOptions.flatMap((o) => GetSquareExternalIds(o.externalIDs)).map((x) => x.value),
    );
  });

  let existingSquareObjects: CatalogObject[] = [];
  if (existingSquareExternalIds.length > 0) {
    const batchRetrieveCatalogObjectsResponse = await deps.squareService.BatchRetrieveCatalogObjects(
      existingSquareExternalIds,
      false,
    );
    if (!batchRetrieveCatalogObjectsResponse.success) {
      deps.logger.error(
        { err: batchRetrieveCatalogObjectsResponse.error },
        'Getting current square CatalogObjects failed',
      );
      return batches.map((_) => null);
    }
    existingSquareObjects = batchRetrieveCatalogObjectsResponse.result.objects ?? [];
  }

  const catalogObjectsForUpsert: CatalogObject[] = [];
  batchData.forEach((b, i) => {
    catalogObjectsForUpsert.push(
      ModifierTypeToSquareCatalogObject(
        getLocationsConsidering3pFlag(deps, b.updatedModifierType.displayFlags.is3p),
        b.updatedModifierType,
        b.updatedOptions,
        existingSquareObjects,
        ('000' + String(i)).slice(-3),
      ),
    );
  });

  const mappings: CatalogIdMapping[] = [];
  if (catalogObjectsForUpsert.length > 0) {
    const upsertResponse = await deps.squareService.BatchUpsertCatalogObjects(
      chunk(catalogObjectsForUpsert, deps.appConfig.squareBatchChunkSize).map((x) => ({
        objects: x,
      })),
    );
    if (!upsertResponse.success) {
      const errorDetail = 'Failed to update square modifier options';
      deps.logger.error({ err: upsertResponse.error }, errorDetail);
      throw Error(errorDetail);
    }
    mappings.push(...(upsertResponse.result.idMappings ?? []));
  }

  const updatedWarioObjects = batchData.map((batch, batchId) => {
    return {
      modifierType: {
        ...batch.updatedModifierType,
        externalIDs: [
          ...batch.updatedModifierType.externalIDs,
          ...IdMappingsToExternalIds(mappings, ('000' + String(batchId)).slice(-3)),
        ],
      },
      options: batch.updatedOptions.map((opt, i) => ({
        ...opt,
        externalIDs: [
          ...opt.externalIDs,
          ...IdMappingsToExternalIds(mappings, `${('000' + String(batchId)).slice(-3)}S${('000' + String(i)).slice(-3)}S`),
        ],
      })),
    };
  });

  await Promise.all(
    updatedWarioObjects
      .flatMap((b) => b.options)
      .map(async (b) => {
        return (await deps.wOptionModel.findByIdAndUpdate(b.id, b, { new: true }))?.toObject() ?? null;
      }),
  );

  const updatedModifierTypes = await Promise.all(
    updatedWarioObjects.map(async (b) => {
      return (
        (
          await deps.wOptionTypeModel.findByIdAndUpdate(b.modifierType.id, b.modifierType, { new: true })
        )?.toObject() ?? null
      );
    }),
  );

  await deps.syncModifierTypes();
  await deps.syncOptions();

  if (!suppressFullRecomputation) {
    deps.recomputeCatalog();
    await deps.updateProductsReferencingModifierTypeId(
      batchData.filter((x) => x.updateModifierOptionsAndProducts).map((x) => x.updatedModifierType.id),
    );
    await deps.syncProductInstances();

    deps.recomputeCatalog();
  }
  return updatedModifierTypes;
};

export const updateModifierType = async (deps: ModifierDeps, props: UpdateModifierTypeProps) => {
  return (await batchUpdateModifierType(deps, [props], false, false))[0];
};

export const deleteModifierType = async (deps: ModifierDeps, mt_id: string) => {
  deps.logger.debug({ mt_id }, 'Removing Modifier Type');
  const doc = await deps.wOptionTypeModel.findByIdAndDelete(mt_id).exec();
  if (!doc) {
    deps.logger.warn('Unable to delete the ModifierType from the database.');
    return null;
  }
  const modifierTypeEntry = deps.catalog.modifiers[mt_id];

  // if there are any square ids associated with this modifier type then we delete them first
  await deps.batchDeleteCatalogObjectsFromExternalIds(modifierTypeEntry.modifierType.externalIDs);

  await Promise.all(deps.catalog.modifiers[mt_id].options.map((op) => deleteModifierOption(deps, op, true)));

  await deps.removeModifierTypeFromProducts(mt_id);

  // need to delete any ProductInstanceFunctions that use this MT
  await Promise.all(
    Object.values(deps.productInstanceFunctions).map(async (pif) => {
      if (FindModifierPlacementExpressionsForMTID(pif.expression, mt_id).length > 0) {
        deps.logger.debug({ mt_id, pifId: pif.id }, 'Found product instance function composed of MT, removing PIF');
        // the PIF and any dependent objects will be synced, but the catalog will not be recomputed / emitted
        await deps.deleteProductInstanceFunction(pif.id, true);
      } else if (FindHasAnyModifierExpressionsForMTID(pif.expression, mt_id).length > 0) {
        deps.logger.debug({ mt_id, pifId: pif.id }, 'Found product instance function composed of MT, removing PIF');
        // the PIF and any dependent objects will be synced, but the catalog will not be recomputed / emitted
        await deps.deleteProductInstanceFunction(pif.id, true);
      }
    }),
  );
  await deps.syncOptions();
  await deps.syncModifierTypes();
  deps.recomputeCatalog();
  return doc.toObject();
};

export const createOption = async (deps: ModifierDeps, modifierOption: Omit<IOption, 'id'>) => {
  // first find the Modifier Type ID in the catalog
  if (!Object.hasOwn(deps.catalog.modifiers, modifierOption.modifierTypeId)) {
    return null;
  }

  const modifierTypeEntry = deps.catalog.modifiers[modifierOption.modifierTypeId];
  if (!validateOption(modifierTypeEntry.modifierType, modifierOption)) {
    throw Error('Failed validation on modifier option in a single select modifier type');
  }

  // we need to filter these external IDs because it'll interfere with adding the new modifier to the catalog
  const filteredExternalIds = GetNonSquareExternalIds(modifierOption.externalIDs);
  const adjustedOption: Omit<IOption, 'id'> = {
    ...modifierOption,
    externalIDs: filteredExternalIds,
  };

  // add the new option to the db, sync and recompute the catalog, then use UpdateModifierType to clean up
  const doc = new deps.wOptionModel(adjustedOption);
  await doc.save();
  await deps.syncOptions();
  deps.recomputeCatalog();
  await updateModifierType(deps, {
    id: modifierOption.modifierTypeId,
    modifierType: {},
  });
  deps.recomputeCatalog();
  // since we have new external IDs, we need to pull the modifier option from the catalog after the above syncing
  return deps.catalog.options[doc.id as string];
};

export const batchUpdateModifierOption = async (deps: ModifierDeps, batches: UpdateModifierOptionProps[]) => {
  deps.logger.debug(
    {
      batches: batches.map((b) => ({ id: b.id, updates: b.modifierOption })),
    },
    'Request to update ModifierOption(s)',
  );
  if (!IsSetOfUniqueStrings(batches.map((b) => b.modifierTypeId))) {
    const errorDetail = `Request for multiple option update batches from the same modifier type.`;
    deps.logger.error(errorDetail);
    throw Error(errorDetail);
  }
  const batchesInfo = batches.map((b) => {
    const oldOption = deps.catalog.options[b.id];
    return {
      batch: b,
      oldOption,
      modifierTypeEntry: deps.catalog.modifiers[b.modifierTypeId],
      updatedOption: { ...(oldOption as IOption), ...b.modifierOption },
    };
  });

  const squareCatalogObjectsToDelete: string[] = [];
  const existingSquareExternalIds: string[] = [];
  batchesInfo.forEach((b, _i) => {
    if (!validateOption(b.modifierTypeEntry.modifierType, b.updatedOption)) {
      const errorDetail = `Failed validation on modifier option`;
      deps.logger.error({ option: b.updatedOption }, errorDetail);
      throw Error(errorDetail);
    }
    if (b.batch.modifierOption.metadata) {
      if (!b.batch.modifierOption.metadata.allowHeavy && b.oldOption.metadata.allowHeavy) {
        const kv = b.updatedOption.externalIDs.splice(
          GetSquareIdIndexFromExternalIds(b.updatedOption.externalIDs, 'MODIFIER_HEAVY'),
          1,
        )[0];
        squareCatalogObjectsToDelete.push(kv.value);
      }
      if (!b.batch.modifierOption.metadata.allowLite && b.oldOption.metadata.allowLite) {
        const kv = b.updatedOption.externalIDs.splice(
          GetSquareIdIndexFromExternalIds(b.updatedOption.externalIDs, 'MODIFIER_LITE'),
          1,
        )[0];
        squareCatalogObjectsToDelete.push(kv.value);
      }
      if (!b.batch.modifierOption.metadata.allowOTS && b.oldOption.metadata.allowOTS) {
        const kv = b.updatedOption.externalIDs.splice(
          GetSquareIdIndexFromExternalIds(b.updatedOption.externalIDs, 'MODIFIER_OTS'),
          1,
        )[0];
        squareCatalogObjectsToDelete.push(kv.value);
      }
      if (!b.batch.modifierOption.metadata.can_split && b.oldOption.metadata.can_split) {
        const kvL = b.updatedOption.externalIDs.splice(
          GetSquareIdIndexFromExternalIds(b.updatedOption.externalIDs, 'MODIFIER_LEFT'),
          1,
        )[0];
        const kvR = b.updatedOption.externalIDs.splice(
          GetSquareIdIndexFromExternalIds(b.updatedOption.externalIDs, 'MODIFIER_RIGHT'),
          1,
        )[0];
        squareCatalogObjectsToDelete.push(kvL.value, kvR.value);
      }
    }
    existingSquareExternalIds.push(
      ...GetSquareExternalIds(b.modifierTypeEntry.modifierType.externalIDs).map((x) => x.value),
    );
    existingSquareExternalIds.push(
      ...b.modifierTypeEntry.options
        .filter((x) => x !== b.batch.id)
        .flatMap((oId) => GetSquareExternalIds(deps.catalog.options[oId].externalIDs))
        .map((x) => x.value),
    );
    existingSquareExternalIds.push(...GetSquareExternalIds(b.updatedOption.externalIDs).map((x) => x.value));
  });

  if (squareCatalogObjectsToDelete.length > 0) {
    deps.logger.debug(
      { squareCatalogObjectsToDelete },
      'Deleting Square Catalog Modifiers due to ModifierOption update',
    );
    await deps.squareService.BatchDeleteCatalogObjects(squareCatalogObjectsToDelete);
  }
  let existingSquareObjects: CatalogObject[] = [];
  if (existingSquareExternalIds.length > 0) {
    const batchRetrieveCatalogObjectsResponse = await deps.squareService.BatchRetrieveCatalogObjects(
      existingSquareExternalIds,
      false,
    );
    if (!batchRetrieveCatalogObjectsResponse.success) {
      deps.logger.error(
        { err: batchRetrieveCatalogObjectsResponse.error },
        'Getting current square CatalogObjects failed',
      );
      return batches.map((_) => null);
    }
    existingSquareObjects = batchRetrieveCatalogObjectsResponse.result.objects ?? [];
  }
  const catalogObjectsForUpsert: CatalogObject[] = [];
  batchesInfo.forEach((b, i) => {
    const options = b.modifierTypeEntry.options.map((oId) =>
      oId === b.batch.id ? b.updatedOption : deps.catalog.options[oId],
    );
    catalogObjectsForUpsert.push(
      ModifierTypeToSquareCatalogObject(
        getLocationsConsidering3pFlag(deps, b.modifierTypeEntry.modifierType.displayFlags.is3p),
        b.modifierTypeEntry.modifierType,
        options,
        existingSquareObjects,
        ('000' + String(i)).slice(-3),
      ),
    );
  });

  let mappings: CatalogIdMapping[] | undefined;

  if (catalogObjectsForUpsert.length > 0) {
    const upsertResponse = await deps.squareService.BatchUpsertCatalogObjects(
      chunk(catalogObjectsForUpsert, deps.appConfig.squareBatchChunkSize).map((x) => ({
        objects: x,
      })),
    );
    if (!upsertResponse.success) {
      deps.logger.error({ err: upsertResponse.error }, 'Failed to update square modifiers');
      return batches.map((_) => null);
    }
    mappings = upsertResponse.result.idMappings;
  }

  const updated = await Promise.all(
    batchesInfo.map(async (b, i) => {
      const doc = await deps.wOptionModel
        .findByIdAndUpdate(
          b.batch.id,
          {
            ...b.batch.modifierOption,
            externalIDs: [
              ...b.updatedOption.externalIDs,
              ...IdMappingsToExternalIds(mappings, ('000' + String(i)).slice(-3)),
            ],
          },
          { new: true },
        )
        .exec();
      if (!doc) {
        return null;
      }
      return doc.toObject();
    }),
  );

  const updatedOptions = batchesInfo.map((x) => x.batch.id);
  await deps.syncOptions();

  // Delegate product instance updates to CatalogProviderService
  await deps.updateProductInstancesForOptionChanges(updatedOptions);

  deps.recomputeCatalog();

  return updated;
};

export const updateModifierOption = async (deps: ModifierDeps, props: UpdateModifierOptionProps) => {
  return (await batchUpdateModifierOption(deps, [props]))[0];
};

export const deleteModifierOption = async (deps: ModifierDeps, mo_id: string, suppress_catalog_recomputation: boolean = false) => {
  deps.logger.debug({ mo_id }, 'Removing Modifier Option');
  const doc = await deps.wOptionModel.findByIdAndDelete(mo_id).exec();
  if (!doc) {
    return null;
  }

  // NOTE: this removes the modifiers from the Square ITEMs and ITEM_VARIATIONs as well
  await deps.batchDeleteCatalogObjectsFromExternalIds(doc.externalIDs);

  await deps.removeModifierOptionFromProductInstances(doc.modifierTypeId, mo_id);

  await deps.syncOptions();
  // need to delete any ProductInstanceFunctions that use this MO
  await Promise.all(
    Object.values(deps.productInstanceFunctions).map(async (pif) => {
      const dependent_pfi_expressions = FindModifierPlacementExpressionsForMTID(
        pif.expression,
        doc.modifierTypeId,
      ) as AbstractExpressionModifierPlacementExpression[];
      const filtered = dependent_pfi_expressions.filter((x) => x.expr.moid === mo_id);
      if (filtered.length > 0) {
        deps.logger.debug(
          { modifierTypeId: doc.modifierTypeId, mo_id, pifId: pif.id },
          'Found product instance function composed of MO, removing PIF',
        );
        // the PIF and any dependent objects will be synced, but the catalog will not be recomputed / emitted
        await deps.deleteProductInstanceFunction(pif.id, true);
      }
    }),
  );
  if (!suppress_catalog_recomputation) {
    deps.recomputeCatalog();
  }
  return doc.toObject();
};
