/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { chunk } from 'es-toolkit/compat';
import { Model } from 'mongoose';
import { CatalogIdMapping, CatalogObject } from 'square';

import {
  AbstractExpressionModifierPlacementExpression,
  FindHasAnyModifierExpressionsForMTID,
  FindModifierPlacementExpressionsForMTID,
  IOption,
  IOptionType,
  IOptionTypeDisplayFlags,
} from '@wcp/wario-shared';

import { IsSetOfUniqueStrings } from '../../utils/utils';
import { AppConfigService } from '../app-config.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import {
  GetNonSquareExternalIds,
  GetSquareExternalIds,
  GetSquareIdIndexFromExternalIds,
  IdMappingsToExternalIds,
  ModifierTypeToSquareCatalogObject,
} from '../square-wario-bridge';
import { SquareService } from '../square/square.service';

import { CatalogFunctionService } from './catalog-function.service';
import { CatalogProviderService } from './catalog-provider.service';
import { CatalogSquareSyncService } from './catalog-square-sync.service';
import {
  LocationsConsidering3pFlag,
  UncommitedOption,
  UpdateModifierOptionProps,
  UpdateModifierTypeProps,
} from './catalog.types';

@Injectable()
export class CatalogModifierService {
  private readonly logger = new Logger(CatalogModifierService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    @InjectModel('WOptionType') private wOptionTypeModel: Model<IOptionType>,
    @InjectModel('WOption') private wOptionModel: Model<IOption>,
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogProvider: CatalogProviderService,
    private dataProviderService: DataProviderService,
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
    @Inject(forwardRef(() => CatalogFunctionService))
    private functionService: CatalogFunctionService,
    @Inject(forwardRef(() => CatalogSquareSyncService))
    private catalogSquareSyncService: CatalogSquareSyncService,
  ) { }

  private getLocationsConsidering3pFlag = (is3p: boolean) =>
    LocationsConsidering3pFlag(
      is3p,
      this.dataProviderService.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
      this.dataProviderService.KeyValueConfig.SQUARE_LOCATION,
      this.dataProviderService.KeyValueConfig.SQUARE_LOCATION_3P,
    );

  ValidateOption = (modifierType: Pick<IOptionType, 'max_selected'>, modifierOption: Partial<UncommitedOption>) => {
    if (modifierType.max_selected === 1) {
      return !modifierOption.metadata || (!modifierOption.metadata.allowOTS && !modifierOption.metadata.can_split);
    }
    return true;
  };

  CreateModifierType = async (modifierType: Omit<IOptionType, 'id'>, options: UncommitedOption[]) => {
    // validate options
    options.forEach((opt) => {
      if (!this.ValidateOption(modifierType, opt)) {
        throw Error('Failed validation on modifier option in a single select modifier type');
      }
    });
    const doc = new this.wOptionTypeModel({
      ...modifierType,
      externalIDs: GetNonSquareExternalIds(modifierType.externalIDs),
    });
    await doc.save();
    const modifierTypeId = doc.id as string;
    await this.catalogProvider.SyncModifierTypes();
    if (options.length > 0) {
      // we need to filter these external IDs because it'll interfere with adding the new modifier to the catalog
      const adjustedOptions: Omit<IOption, 'id'>[] = options
        .map((opt) => ({
          ...opt,
          modifierTypeId,
          externalIDs: GetNonSquareExternalIds(opt.externalIDs),
        }))
        .sort((a, b) => a.ordinal - b.ordinal);
      const optionDocuments = adjustedOptions.map((x) => new this.wOptionModel(x));
      // add the new option to the db, sync and recompute the catalog, then use UpdateModifierType to clean up
      await this.wOptionModel.bulkWrite(
        optionDocuments.map((o) => ({
          insertOne: {
            document: o,
          },
        })),
      );
      await this.catalogProvider.SyncOptions();
      this.catalogProvider.RecomputeCatalog();
      await this.UpdateModifierType({ id: modifierTypeId, modifierType: {} });
    }
    this.catalogProvider.RecomputeCatalogAndEmit();
    return doc.toObject();
  };

  BatchUpdateModifierType = async (
    batches: UpdateModifierTypeProps[],
    suppressFullRecomputation: boolean,
    updateModifierOptionsAndProducts: boolean,
  ): Promise<(IOptionType | null)[]> => {
    this.logger.log(
      `Updating modifier type(s) ${batches.map((x) => `ID: ${x.id}, changes: ${JSON.stringify(x.modifierType)}`).join(', ')}`,
    );

    const batchData = batches.map((b) => {
      const oldMT = this.catalogProvider.ModifierTypes.find((x) => x.id === b.id) as IOptionType;
      return {
        batch: b,
        oldMT,
        updatedModifierType: { ...oldMT, ...b.modifierType },
        updatedOptions: this.catalogProvider.ModifierOptions
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
      const batchRetrieveCatalogObjectsResponse = await this.squareService.BatchRetrieveCatalogObjects(
        existingSquareExternalIds,
        false,
      );
      if (!batchRetrieveCatalogObjectsResponse.success) {
        this.logger.error(
          `Getting current square CatalogObjects failed with ${JSON.stringify(batchRetrieveCatalogObjectsResponse.error)}`,
        );
        return batches.map((_) => null);
      }
      existingSquareObjects = batchRetrieveCatalogObjectsResponse.result.objects ?? [];
    }

    const catalogObjectsForUpsert: CatalogObject[] = [];
    batchData.forEach((b, i) => {
      catalogObjectsForUpsert.push(
        ModifierTypeToSquareCatalogObject(
          this.getLocationsConsidering3pFlag(b.updatedModifierType.displayFlags.is3p),
          b.updatedModifierType,
          b.updatedOptions,
          existingSquareObjects,
          ('000' + i).slice(-3),
        ),
      );
    });

    const mappings: CatalogIdMapping[] = [];
    if (catalogObjectsForUpsert.length > 0) {
      const upsertResponse = await this.squareService.BatchUpsertCatalogObjects(
        chunk(catalogObjectsForUpsert, this.appConfig.squareBatchChunkSize).map((x) => ({
          objects: x,
        })),
      );
      if (!upsertResponse.success) {
        const errorDetail = `Failed to update square modifier options, got errors: ${JSON.stringify(upsertResponse.error)}`;
        this.logger.error(errorDetail);
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
            ...IdMappingsToExternalIds(mappings, ('000' + batchId).slice(-3)),
          ],
        },
        options: batch.updatedOptions.map((opt, i) => ({
          ...opt,
          externalIDs: [
            ...opt.externalIDs,
            ...IdMappingsToExternalIds(mappings, `${('000' + batchId).slice(-3)}S${('000' + i).slice(-3)}S`),
          ],
        })),
      };
    });

    await Promise.all(
      updatedWarioObjects
        .flatMap((b) => b.options)
        .map(async (b) => {
          return (await this.wOptionModel.findByIdAndUpdate(b.id, b, { new: true }))?.toObject() ?? null;
        }),
    );

    const updatedModifierTypes = await Promise.all(
      updatedWarioObjects.map(async (b) => {
        return (
          (
            await this.wOptionTypeModel.findByIdAndUpdate(b.modifierType.id, b.modifierType, { new: true })
          )?.toObject() ?? null
        );
      }),
    );

    await this.catalogProvider.SyncModifierTypes();
    await this.catalogProvider.SyncOptions();

    if (!suppressFullRecomputation) {
      this.catalogProvider.RecomputeCatalog();
      await this.catalogProvider.UpdateProductsReferencingModifierTypeId(
        batchData.filter((x) => x.updateModifierOptionsAndProducts).map((x) => x.updatedModifierType.id),
      );
      await this.catalogProvider.SyncProductInstances();

      this.catalogProvider.RecomputeCatalogAndEmit();
    }
    return updatedModifierTypes;
  };

  UpdateModifierType = async (props: UpdateModifierTypeProps) => {
    return (await this.BatchUpdateModifierType([props], false, false))[0];
  };

  DeleteModifierType = async (mt_id: string) => {
    this.logger.debug(`Removing Modifier Type: ${mt_id}`);
    const doc = await this.wOptionTypeModel.findByIdAndDelete(mt_id).exec();
    if (!doc) {
      this.logger.warn('Unable to delete the ModifierType from the database.');
      return null;
    }
    const modifierTypeEntry = this.catalogProvider.Catalog.modifiers[mt_id];

    // if there are any square ids associated with this modifier type then we delete them first
    await this.catalogSquareSyncService.BatchDeleteCatalogObjectsFromExternalIds(modifierTypeEntry.modifierType.externalIDs);

    await Promise.all(this.catalogProvider.Catalog.modifiers[mt_id].options.map((op) => this.DeleteModifierOption(op, true)));

    // We need to access wProductModel and wProductInstanceModel to pull modifiers.
    // Since we don't have direct access, we should probably add a method in CatalogProviderService or inject the models here.
    // For now, let's inject the models in constructor if possible or add a helper in CatalogProviderService.
    // Actually, the original code accessed wProductModel and wProductInstanceModel directly.
    // I should probably inject them here too.
    // Wait, I can't access them if I don't inject them.
    // I'll add them to the constructor in a separate edit if needed, but I'll try to use what I have.
    // Ah, I see I missed injecting WProduct and WProductInstance in the stub.
    // I will add them now.

    // Actually, better to delegate this product cleanup to CatalogProviderService or CatalogProductService.
    // But CatalogProductService is not implemented yet.
    // So I should probably implement a helper in CatalogProviderService for this cleanup.
    // "RemoveModifierTypeFromProducts"

    await this.catalogProvider.RemoveModifierTypeFromProducts(mt_id);

    // need to delete any ProductInstanceFunctions that use this MT
    await Promise.all(
      Object.values(this.catalogProvider.ProductInstanceFunctions).map(async (pif) => {
        if (FindModifierPlacementExpressionsForMTID(pif.expression, mt_id).length > 0) {
          this.logger.debug(`Found product instance function composed of ${mt_id}, removing PIF with ID: ${pif.id}.`);
          // the PIF and any dependent objects will be synced, but the catalog will not be recomputed / emitted
          await this.functionService.DeleteProductInstanceFunction(pif.id, true);
        } else if (FindHasAnyModifierExpressionsForMTID(pif.expression, mt_id).length > 0) {
          this.logger.debug(`Found product instance function composed of ${mt_id}, removing PIF with ID: ${pif.id}.`);
          // the PIF and any dependent objects will be synced, but the catalog will not be recomputed / emitted
          await this.functionService.DeleteProductInstanceFunction(pif.id, true);
        }
      }),
    );
    await this.catalogProvider.SyncOptions();
    await this.catalogProvider.SyncModifierTypes();
    this.catalogProvider.RecomputeCatalogAndEmit();
    return doc.toObject();
  };

  CreateOption = async (modifierOption: Omit<IOption, 'id'>) => {
    // first find the Modifier Type ID in the catalog
    if (!Object.hasOwn(this.catalogProvider.Catalog.modifiers, modifierOption.modifierTypeId)) {
      return null;
    }

    const modifierTypeEntry = this.catalogProvider.Catalog.modifiers[modifierOption.modifierTypeId];
    if (!this.ValidateOption(modifierTypeEntry.modifierType, modifierOption)) {
      throw Error('Failed validation on modifier option in a single select modifier type');
    }

    // we need to filter these external IDs because it'll interfere with adding the new modifier to the catalog
    const filteredExternalIds = GetNonSquareExternalIds(modifierOption.externalIDs);
    const adjustedOption: Omit<IOption, 'id'> = {
      ...modifierOption,
      externalIDs: filteredExternalIds,
    };

    // add the new option to the db, sync and recompute the catalog, then use UpdateModifierType to clean up
    const doc = new this.wOptionModel(adjustedOption);
    await doc.save();
    await this.catalogProvider.SyncOptions();
    this.catalogProvider.RecomputeCatalog();
    await this.UpdateModifierType({
      id: modifierOption.modifierTypeId,
      modifierType: {},
    });
    this.catalogProvider.RecomputeCatalogAndEmit();
    // since we have new external IDs, we need to pull the modifier option from the catalog after the above syncing
    return this.catalogProvider.Catalog.options[doc.id as string];
  };

  UpdateModifierOption = async (props: UpdateModifierOptionProps) => {
    return (await this.BatchUpdateModifierOption([props]))[0];
  };

  BatchUpdateModifierOption = async (batches: UpdateModifierOptionProps[]) => {
    this.logger.log(
      `Request to update ModifierOption(s) ${batches.map((b) => `ID: ${b.id}, updates: ${JSON.stringify(b.modifierOption)}`).join(', ')}`,
    );
    if (!IsSetOfUniqueStrings(batches.map((b) => b.modifierTypeId))) {
      const errorDetail = `Request for multiple option update batches from the same modifier type.`;
      this.logger.error(errorDetail);
      throw Error(errorDetail);
    }
    const batchesInfo = batches.map((b) => {
      const oldOption = this.catalogProvider.Catalog.options[b.id];
      return {
        batch: b,
        oldOption,
        modifierTypeEntry: this.catalogProvider.Catalog.modifiers[b.modifierTypeId],
        updatedOption: { ...(oldOption as IOption), ...b.modifierOption },
      };
    });

    const squareCatalogObjectsToDelete: string[] = [];
    const existingSquareExternalIds: string[] = [];
    batchesInfo.forEach((b, _i) => {
      if (!this.ValidateOption(b.modifierTypeEntry.modifierType, b.updatedOption)) {
        const errorDetail = `Failed validation on modifier option ${JSON.stringify(b.updatedOption)} in a single select modifier type.`;
        this.logger.error(errorDetail);
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
          .flatMap((oId) => GetSquareExternalIds(this.catalogProvider.Catalog.options[oId].externalIDs))
          .map((x) => x.value),
      );
      existingSquareExternalIds.push(...GetSquareExternalIds(b.updatedOption.externalIDs).map((x) => x.value));
    });

    if (squareCatalogObjectsToDelete.length > 0) {
      this.logger.log(
        `Deleting Square Catalog Modifiers due to ModifierOption update: ${squareCatalogObjectsToDelete.join(', ')}`,
      );
      await this.squareService.BatchDeleteCatalogObjects(squareCatalogObjectsToDelete);
    }
    let existingSquareObjects: CatalogObject[] = [];
    if (existingSquareExternalIds.length > 0) {
      const batchRetrieveCatalogObjectsResponse = await this.squareService.BatchRetrieveCatalogObjects(
        existingSquareExternalIds,
        false,
      );
      if (!batchRetrieveCatalogObjectsResponse.success) {
        this.logger.error(
          `Getting current square CatalogObjects failed with ${JSON.stringify(batchRetrieveCatalogObjectsResponse.error)}`,
        );
        return batches.map((_) => null);
      }
      existingSquareObjects = batchRetrieveCatalogObjectsResponse.result.objects ?? [];
    }
    const catalogObjectsForUpsert: CatalogObject[] = [];
    batchesInfo.forEach((b, i) => {
      const options = b.modifierTypeEntry.options.map((oId) =>
        oId === b.batch.id ? b.updatedOption : this.catalogProvider.Catalog.options[oId],
      );
      catalogObjectsForUpsert.push(
        ModifierTypeToSquareCatalogObject(
          this.getLocationsConsidering3pFlag(b.modifierTypeEntry.modifierType.displayFlags.is3p),
          b.modifierTypeEntry.modifierType,
          options,
          existingSquareObjects,
          ('000' + i).slice(-3),
        ),
      );
    });

    let mappings: CatalogIdMapping[] | undefined;

    if (catalogObjectsForUpsert.length > 0) {
      const upsertResponse = await this.squareService.BatchUpsertCatalogObjects(
        chunk(catalogObjectsForUpsert, this.appConfig.squareBatchChunkSize).map((x) => ({
          objects: x,
        })),
      );
      if (!upsertResponse.success) {
        this.logger.error(`Failed to update square modifiers, got errors: ${JSON.stringify(upsertResponse.error)}`);
        return batches.map((_) => null);
      }
      mappings = upsertResponse.result.idMappings;
    }

    const updated = await Promise.all(
      batchesInfo.map(async (b, i) => {
        const doc = await this.wOptionModel
          .findByIdAndUpdate(
            b.batch.id,
            {
              ...b.batch.modifierOption,
              externalIDs: [
                ...b.updatedOption.externalIDs,
                ...IdMappingsToExternalIds(mappings, ('000' + i).slice(-3)),
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
    await this.catalogProvider.SyncOptions();

    // Delegate product instance updates to CatalogProviderService
    await this.catalogProvider.UpdateProductInstancesForOptionChanges(updatedOptions);

    this.catalogProvider.RecomputeCatalogAndEmit();

    return updated;
  };

  DeleteModifierOption = async (mo_id: string, suppress_catalog_recomputation: boolean = false) => {
    this.logger.debug(`Removing Modifier Option ${mo_id}`);
    const doc = await this.wOptionModel.findByIdAndDelete(mo_id).exec();
    if (!doc) {
      return null;
    }

    // NOTE: this removes the modifiers from the Square ITEMs and ITEM_VARIATIONs as well
    await this.catalogSquareSyncService.BatchDeleteCatalogObjectsFromExternalIds(doc.externalIDs);

    await this.catalogProvider.RemoveModifierOptionFromProductInstances(doc.modifierTypeId, mo_id);

    await this.catalogProvider.SyncOptions();
    // need to delete any ProductInstanceFunctions that use this MO
    await Promise.all(
      Object.values(this.catalogProvider.ProductInstanceFunctions).map(async (pif) => {
        const dependent_pfi_expressions = FindModifierPlacementExpressionsForMTID(
          pif.expression,
          doc.modifierTypeId,
        ) as AbstractExpressionModifierPlacementExpression[];
        const filtered = dependent_pfi_expressions.filter((x) => x.expr.moid === mo_id);
        if (filtered.length > 0) {
          this.logger.debug(
            `Found product instance function composed of ${doc.modifierTypeId}:${mo_id}, removing PIF with ID: ${pif.id}.`,
          );
          // the PIF and any dependent objects will be synced, but the catalog will not be recomputed / emitted
          await this.functionService.DeleteProductInstanceFunction(pif.id, true);
        }
      }),
    );
    if (!suppress_catalog_recomputation) {
      this.catalogProvider.RecomputeCatalogAndEmit();
    }
    return doc.toObject();
  };
}
