import { chunk } from 'es-toolkit/compat';
import { type PinoLogger } from 'nestjs-pino';
import type { BatchDeleteCatalogObjectsResponse, CatalogIdMapping, CatalogObject } from 'square';

import {
  type AbstractExpressionModifierPlacementExpression,
  type CreateIOptionTypeRequestBody,
  FindHasAnyModifierExpressionsForMTID,
  FindModifierPlacementExpressionsForMTID,
  type ICatalog,
  type IOption,
  type IOptionType,
  type IOptionTypeDisplayFlags,
  type IProductInstanceFunction,
  type KeyValue,
  type UpdateIOptionProps,
  type UpdateIOptionRequestBody,
  type UpdateIOptionTypeProps,
  type UpdateIOptionTypeRequestBody,
} from '@wcp/wario-shared';

import type { AppConfigService } from 'src/config/app-config.service';
import type { DataProviderService } from 'src/config/data-provider/data-provider.service';
import {
  GetNonSquareExternalIds,
  GetSquareExternalIds,
  GetSquareIdIndexFromExternalIds,
  IdMappingsToExternalIds,
  ModifierTypeToSquareCatalogObject,
} from 'src/config/square-wario-bridge';
import { type DeleteProductInstanceFunctionResult } from 'src/modules/catalog-provider/catalog-function.functions';

import type { IOptionTypeRepository } from '../../repositories/interfaces/option-type.repository.interface';
import type { IOptionRepository } from '../../repositories/interfaces/option.repository.interface';
import { IsSetOfUniqueStrings } from '../../utils/utils';
import type { SquareProviderApiCallReturnValue, SquareService } from '../integrations/square/square.service';

import { LocationsConsidering3pFlag } from './catalog.types';

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface ModifierDeps {
  optionTypeRepository: IOptionTypeRepository;
  optionRepository: IOptionRepository;
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
  batchDeleteCatalogObjectsFromExternalIds: (
    ids: KeyValue[],
  ) => Promise<true | SquareProviderApiCallReturnValue<BatchDeleteCatalogObjectsResponse>>;
  updateProductsReferencingModifierTypeId: (ids: string[]) => Promise<void>;
  updateProductInstancesForOptionChanges: (ids: string[]) => Promise<void>;
  removeModifierTypeFromProducts: (mt_id: string) => Promise<void>;
  removeModifierOptionFromProductInstances: (modifierTypeId: string, mo_id: string) => Promise<void>;
  deleteProductInstanceFunction: (
    pifId: string,
    suppressRecompute: boolean,
  ) => Promise<DeleteProductInstanceFunctionResult | null>;
}

// ============================================================================
// Helpers
// ============================================================================

const getLocationsConsidering3pFlag = (deps: ModifierDeps, is3p: boolean) =>
  LocationsConsidering3pFlag(
    is3p,
    deps.dataProviderService.getKeyValueConfig().SQUARE_LOCATION_ALTERNATE,
    deps.dataProviderService.getKeyValueConfig().SQUARE_LOCATION,
    deps.dataProviderService.getKeyValueConfig().SQUARE_LOCATION_3P,
  );

export const validateOption = (
  modifierType: Pick<IOptionType, 'max_selected'>,
  modifierOption: Pick<IOption, 'metadata'>,
) => {
  if (modifierType.max_selected === 1) {
    return !modifierOption.metadata.allowOTS && !modifierOption.metadata.can_split;
  }
  return true;
};

// ============================================================================
// Operations
// ============================================================================

export const createModifierType = async (deps: ModifierDeps, body: CreateIOptionTypeRequestBody) => {
  const options = body.options || [];
  // validate options
  options.forEach((opt) => {
    if (!validateOption(body, opt)) {
      throw Error('Failed validation on modifier option in a single select modifier type');
    }
  });

  // we need to filter these external IDs because it'll interfere with adding the new modifier to the catalog
  // Options array order in the request defines the display order
  const adjustedOptions: Omit<IOption, 'id'>[] = options.map((opt) => ({
    ...(opt as Omit<IOption, 'id'>),
    externalIDs: GetNonSquareExternalIds(opt.externalIDs),
  }));

  const createdOptions = adjustedOptions.length > 0 ? await deps.optionRepository.bulkCreate(adjustedOptions) : [];
  if (createdOptions.length > 0) {
    deps.logger.debug(
      {
        options: createdOptions,
      },
      'Created options',
    );
  }
  const optionIds = createdOptions.map((o) => o.id);

  const created = await deps.optionTypeRepository.create({
    ...(body as Omit<IOptionType, 'id' | 'options'>),
    options: optionIds,
    externalIDs: GetNonSquareExternalIds(body.externalIDs),
  });

  await deps.syncOptions();
  await deps.syncModifierTypes();
  deps.recomputeCatalog();
  return created;
};

export const batchUpdateModifierType = async (
  deps: ModifierDeps,
  batches: UpdateIOptionTypeProps[],
  suppressFullRecomputation: boolean,
  updateModifierOptionsAndProducts: boolean,
): Promise<IOptionType[] | null> => {
  deps.logger.debug(
    {
      batches,
    },
    'Updating modifier type(s)',
  );

  // 1. Get old modifier type and options
  // create a merged modifier type and determine if we need to update modifier options and products
  const batchData = batches.map((b) => {
    const oldMT = deps.catalog.modifiers[b.id];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!oldMT) {
      throw Error(`Modifier type ${b.id} not found`);
    }
    let thisBatchUpdateModifierOptionsAndProducts = updateModifierOptionsAndProducts;
    if (b.modifierType.options) {
      // TODO DETERMINE WHAT THIS MEANS IF THE LIST REMOVES OPTIONS
      if (
        !(
          b.modifierType.options.length === oldMT.options.length &&
          b.modifierType.options.every((opt) => {
            return oldMT.options.includes(opt);
          })
        )
      ) {
        throw Error(
          `Cannot perform batch update on modifier type ${b.id} with different options inside the options list, old: ${JSON.stringify(oldMT.options)}, new: ${JSON.stringify(b.modifierType.options)}`,
        );
      }
      // batch will re-order the options, so we need to adjust the ordering in square, meaning we need to run an update on the options
      // we're not going to be precious, so we're going to update all of the options
      thisBatchUpdateModifierOptionsAndProducts = true;
    }
    // Get options that belong to this modifier type from its options array
    const { id: _mtid, ...oldModifierTypeData } = oldMT;
    const optionsForMT = oldMT.options.map((optId) => deps.modifierOptions.find((o) => o.id === optId) as IOption);
    return {
      batch: b,
      oldMT,
      updatedModifierType: { ...oldModifierTypeData, ...(b.modifierType as UpdateIOptionTypeRequestBody) },
      updatedOptions: optionsForMT.map((o) => {
        const { id: oid, ...oldOptionData } = o;
        return { id: oid, data: { ...oldOptionData, ...(b.modifierType.displayFlags as IOptionTypeDisplayFlags) } };
      }),
      updateModifierOptionsAndProducts: thisBatchUpdateModifierOptionsAndProducts,
    };
  });

  /**
   * @todo POST MIGRATION TO NEW WARIO_SHARED @TODO: we need to update the modifier options at some point and I think it needs to be here?
   */

  // 2. Get all existing square objects across all batches
  const existingSquareExternalIds: string[] = [];
  batchData.forEach((b) => {
    existingSquareExternalIds.push(...GetSquareExternalIds(b.oldMT.externalIDs).map((x) => x.value));
    existingSquareExternalIds.push(
      ...b.updatedOptions.flatMap((o) => GetSquareExternalIds(o.data.externalIDs)).map((x) => x.value),
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
      return null;
    }
    existingSquareObjects = batchRetrieveCatalogObjectsResponse.result.objects ?? [];
  }

  // 3. create square objects for upsert
  const catalogObjectsForUpsert: CatalogObject[] = [];
  batchData.forEach((b, i) => {
    catalogObjectsForUpsert.push(
      ModifierTypeToSquareCatalogObject(
        getLocationsConsidering3pFlag(deps, b.updatedModifierType.displayFlags.is3p),
        b.updatedModifierType,
        b.updatedModifierType.ordinal,
        b.updatedOptions.map((o) => o.data),
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
      id: batch.batch.id,
      modifierType: {
        ...batch.updatedModifierType,
        externalIDs: [
          ...batch.updatedModifierType.externalIDs,
          ...IdMappingsToExternalIds(mappings, ('000' + String(batchId)).slice(-3)),
        ],
      },
      options: batch.updatedOptions.map((opt, i) => ({
        id: opt.id,
        data: {
          ...opt.data,
          externalIDs: [
            ...opt.data.externalIDs,
            ...IdMappingsToExternalIds(
              mappings,
              `${('000' + String(batchId)).slice(-3)}S${('000' + String(i)).slice(-3)}S`,
            ),
          ],
        },
      })),
    };
  });

  const newOptions = updatedWarioObjects.flatMap((b) => b.options);
  const updatedOptionsCount = await deps.optionRepository.bulkUpdate(newOptions);
  if (updatedOptionsCount !== newOptions.length) {
    deps.logger.error({ updatedOptionsCount, newOptions }, 'Failed to update options in batch');
    return null;
  }

  const updatedModifierTypes = updatedWarioObjects.map((x) => ({ id: x.id, data: x.modifierType }));
  const updatedModifierTypeCount = await deps.optionTypeRepository.bulkUpdate(updatedModifierTypes);
  if (updatedModifierTypeCount !== updatedModifierTypes.length) {
    deps.logger.error({ updatedModifierTypeCount, updatedModifierTypes }, 'Failed to update modifier types in batch');
    return null;
  }

  await deps.syncModifierTypes();
  await deps.syncOptions();

  if (!suppressFullRecomputation) {
    deps.recomputeCatalog();
    await deps.updateProductsReferencingModifierTypeId(
      batchData.filter((x) => x.updateModifierOptionsAndProducts).map((x) => x.batch.id),
    );
    await deps.syncProductInstances();

    deps.recomputeCatalog();
  }
  return updatedModifierTypes.map((x) => ({ id: x.id, ...x.data }));
};

export const updateModifierType = async (deps: ModifierDeps, props: UpdateIOptionTypeProps) => {
  const updated = await batchUpdateModifierType(deps, [props], false, false);
  return updated ? updated[0] : null;
};

export const deleteModifierType = async (deps: ModifierDeps, mt_id: string) => {
  deps.logger.debug({ mt_id }, 'Removing Modifier Type');

  const existing = await deps.optionTypeRepository.findById(mt_id);
  if (!existing) {
    deps.logger.warn('Unable to delete the ModifierType from the database.');
    return null;
  }

  const deleted = await deps.optionTypeRepository.delete(mt_id);
  if (!deleted) {
    deps.logger.warn('Unable to delete the ModifierType from the database.');
    return null;
  }

  const modifierType = deps.catalog.modifiers[mt_id];

  // if there are any square ids associated with this modifier type then we delete them first
  await deps.batchDeleteCatalogObjectsFromExternalIds(modifierType.externalIDs);

  await Promise.all(modifierType.options.map((op) => deleteModifierOption(deps, mt_id, op, true)));

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
  return existing;
};

export const createOption = async (deps: ModifierDeps, modifierTypeId: string, modifierOption: Omit<IOption, 'id'>) => {
  // first find the Modifier Type ID in the catalog
  if (!Object.hasOwn(deps.catalog.modifiers, modifierTypeId)) {
    return null;
  }

  const modifierType = deps.catalog.modifiers[modifierTypeId];
  if (!validateOption(modifierType, modifierOption)) {
    throw Error('Failed validation on modifier option in a single select modifier type');
  }

  // we need to filter these external IDs because it'll interfere with adding the new modifier to the catalog
  const filteredExternalIds = GetNonSquareExternalIds(modifierOption.externalIDs);
  const adjustedOption: Omit<IOption, 'id'> = {
    ...modifierOption,
    externalIDs: filteredExternalIds,
  };

  // add the new option to the db, sync and recompute the catalog, then use UpdateModifierType to clean up
  const created = await deps.optionRepository.create(adjustedOption);
  await deps.syncOptions();
  deps.recomputeCatalog();
  await updateModifierType(deps, {
    id: modifierTypeId,
    modifierType: {},
  });
  deps.recomputeCatalog();
  // since we have new external IDs, we need to pull the modifier option from the catalog after the above syncing
  return deps.catalog.options[created.id];
};

export const batchUpdateModifierOption = async (deps: ModifierDeps, batches: UpdateIOptionProps[]) => {
  deps.logger.debug(
    {
      batches: batches.map((b) => ({ id: b.id, updates: b.option })),
    },
    'Request to update ModifierOption(s)',
  );
  if (!IsSetOfUniqueStrings(batches.map((b) => b.modifierTypeId))) {
    const errorDetail = `Request for multiple option update batches from the same modifier type.`;
    deps.logger.error(errorDetail);
    throw Error(errorDetail);
  }
  const batchesInfo = batches.map((batch) => {
    const modifierType = deps.catalog.modifiers[batch.modifierTypeId];
    const oldOption = deps.catalog.options[batch.id];
    const { id: _id, ...oldOptionData } = oldOption;
    const updatedOption = { ...oldOptionData, ...(batch.option as UpdateIOptionRequestBody) };
    return {
      batch,
      modifierType,
      oldOption,
      updatedOption,
    };
  });

  const squareCatalogObjectsToDelete: string[] = [];
  const existingSquareExternalIds: string[] = [];
  batchesInfo.forEach((b, _i) => {
    if (!validateOption(b.modifierType, b.updatedOption)) {
      const errorDetail = `Failed validation on modifier option`;
      deps.logger.error({ option: b.updatedOption }, errorDetail);
      throw Error(errorDetail);
    }
    if (b.batch.option.metadata) {
      if (!b.batch.option.metadata.allowHeavy && b.oldOption.metadata.allowHeavy) {
        const kv = b.updatedOption.externalIDs.splice(
          GetSquareIdIndexFromExternalIds(b.updatedOption.externalIDs, 'MODIFIER_HEAVY'),
          1,
        )[0];
        squareCatalogObjectsToDelete.push(kv.value);
      }
      if (!b.batch.option.metadata.allowLite && b.oldOption.metadata.allowLite) {
        const kv = b.updatedOption.externalIDs.splice(
          GetSquareIdIndexFromExternalIds(b.updatedOption.externalIDs, 'MODIFIER_LITE'),
          1,
        )[0];
        squareCatalogObjectsToDelete.push(kv.value);
      }
      if (!b.batch.option.metadata.allowOTS && b.oldOption.metadata.allowOTS) {
        const kv = b.updatedOption.externalIDs.splice(
          GetSquareIdIndexFromExternalIds(b.updatedOption.externalIDs, 'MODIFIER_OTS'),
          1,
        )[0];
        squareCatalogObjectsToDelete.push(kv.value);
      }
      if (!b.batch.option.metadata.can_split && b.oldOption.metadata.can_split) {
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
    existingSquareExternalIds.push(...GetSquareExternalIds(b.modifierType.externalIDs).map((x) => x.value));
    existingSquareExternalIds.push(
      ...b.modifierType.options
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
      return null;
    }
    existingSquareObjects = batchRetrieveCatalogObjectsResponse.result.objects ?? [];
  }
  const catalogObjectsForUpsert: CatalogObject[] = [];
  batchesInfo.forEach((b, i) => {
    const options = b.modifierType.options.map((oId) =>
      oId === b.batch.id ? b.updatedOption : deps.catalog.options[oId],
    );
    catalogObjectsForUpsert.push(
      ModifierTypeToSquareCatalogObject(
        getLocationsConsidering3pFlag(deps, b.modifierType.displayFlags.is3p),
        b.modifierType,
        i, // modifierTypeOrdinal
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
      return null;
    }
    mappings = upsertResponse.result.idMappings;
  }

  const updates = batchesInfo.map((b, i) => {
    return {
      ...b,
      updatedOption: {
        ...b.updatedOption,
        externalIDs: [
          ...b.updatedOption.externalIDs,
          ...IdMappingsToExternalIds(mappings, ('000' + String(i)).slice(-3)),
        ],
      },
    };
  });
  const updatedCount = await deps.optionRepository.bulkUpdate(
    updates.map((x) => ({ id: x.batch.id, data: x.updatedOption })),
  );
  if (updatedCount !== updates.length) {
    deps.logger.error({ updatedCount, updates }, 'Failed to update options in batch');
    return null;
  }
  await deps.syncOptions();
  deps.logger.debug({ updatedCount }, 'Updated options in batch');
  // Delegate product instance updates to CatalogProviderService
  const updatedOptionsIds = batchesInfo.map((x) => x.batch.id);
  await deps.updateProductInstancesForOptionChanges(updatedOptionsIds);
  deps.recomputeCatalog();
  return updates.map((x) => ({
    id: x.batch.id,
    ...x.updatedOption,
  }));
};

export const updateModifierOption = async (deps: ModifierDeps, props: UpdateIOptionProps) => {
  const updates = await batchUpdateModifierOption(deps, [props]);
  return updates ? updates[0] : null;
};

export const deleteModifierOption = async (
  deps: ModifierDeps,
  modifierTypeId: string,
  mo_id: string,
  suppress_catalog_recomputation: boolean = false,
) => {
  deps.logger.debug({ modifierTypeId, mo_id }, 'Removing Modifier Option');

  const existing = await deps.optionRepository.findById(mo_id);
  if (!existing) {
    return null;
  }

  const deleted = await deps.optionRepository.delete(mo_id);
  if (!deleted) {
    return null;
  }

  // NOTE: this removes the modifiers from the Square ITEMs and ITEM_VARIATIONs as well
  await deps.batchDeleteCatalogObjectsFromExternalIds(existing.externalIDs);

  await deps.removeModifierOptionFromProductInstances(modifierTypeId, mo_id);

  await deps.syncOptions();
  // need to delete any ProductInstanceFunctions that use this MO
  await Promise.all(
    Object.values(deps.productInstanceFunctions).map(async (pif) => {
      const dependent_pfi_expressions = FindModifierPlacementExpressionsForMTID(
        pif.expression,
        modifierTypeId,
      ) as AbstractExpressionModifierPlacementExpression[];
      const filtered = dependent_pfi_expressions.filter((x) => x.expr.moid === mo_id);
      if (filtered.length > 0) {
        deps.logger.debug(
          { modifierTypeId, mo_id, pifId: pif.id },
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
  return existing;
};
