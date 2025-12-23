/**
 * Pure functions for catalog square synchronization operations.
 */
import type { PinoLogger } from 'nestjs-pino';
import type { CatalogObject } from 'square/legacy';

import type {
  ICatalog,
  IOption,
  IOptionType,
  IProduct,
  IProductInstance,
  KeyValue,
  PrinterGroup,
  UpdateIOptionProps,
  UpdateIOptionTypeProps,
  UpsertIProductRequest,
} from '@wcp/wario-shared';

import {
  GetNonSquareExternalIds,
  GetSquareExternalIds,
  GetSquareIdIndexFromExternalIds,
  SquareExternalIdKey,
} from 'src/config/square-wario-bridge';
import { type IProductInstanceRepository } from 'src/repositories';

import type { IOptionTypeRepository } from '../../repositories/interfaces/option-type.repository.interface';
import type { IOptionRepository } from '../../repositories/interfaces/option.repository.interface';
import type { IProductRepository } from '../../repositories/interfaces/product.repository.interface';
import type { SquareService } from '../integrations/square/square.service';

import type { UpdatePrinterGroupProps, UpsertProductInstanceProps } from './catalog.types';

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface SquareSyncDeps {
  logger: PinoLogger;
  squareService: SquareService;
  // State
  printerGroups: Record<string, PrinterGroup>;
  catalog: ICatalog;

  optionRepository: IOptionRepository;
  optionTypeRepository: IOptionTypeRepository;
  productRepository: IProductRepository;
  productInstanceRepository: IProductInstanceRepository;

  // Callbacks to other services/operations
  batchUpdatePrinterGroup: (batches: UpdatePrinterGroupProps[]) => Promise<(PrinterGroup | null)[]>;
  batchUpdateModifierType: (
    batches: UpdateIOptionTypeProps[],
    suppress: boolean,
    updateRelated: boolean,
  ) => Promise<IOptionType[] | null>;
  batchUpdateModifierOption: (batches: UpdateIOptionProps[]) => Promise<IOption[] | null>;
  batchUpdateProductInstance: (
    batches: UpsertProductInstanceProps[],
    suppress: boolean,
  ) => Promise<IProductInstance[] | null>;
  batchUpsertProduct: (
    batches: UpsertIProductRequest[],
  ) => Promise<{ product: IProduct; instances: IProductInstance[] }[] | null>;
  findAllProducts: () => Promise<IProduct[]>;
  // Sync Hooks
  syncModifierTypes: () => Promise<boolean>;
  syncOptions: () => Promise<boolean>;
  syncProductInstances: () => Promise<boolean>;
  syncProducts: () => Promise<boolean>;
  recomputeCatalog: () => void;
}

// ============================================================================
// Sync Operations
// ============================================================================

export const batchDeleteCatalogObjectsFromExternalIds = async (deps: SquareSyncDeps, externalIds: KeyValue[]) => {
  const squareKV = GetSquareExternalIds(externalIds);
  if (squareKV.length > 0) {
    deps.logger.debug(`Removing from square... ${squareKV.map((x) => `${x.key}: ${x.value}`).join(', ')}`);
    return await deps.squareService.BatchDeleteCatalogObjects(squareKV.map((x) => x.value));
  }
  return true;
};

export const checkAllPrinterGroupsSquareIdsAndFixIfNeeded = async (deps: SquareSyncDeps) => {
  const printerGroups = deps.printerGroups;
  if (Object.keys(printerGroups).length === 0) {
    deps.logger.warn('PrinterGroups is empty, skipping Square sync check');
    return null;
  }
  const squareCatalogObjectIds = Object.values(printerGroups)
    .map((printerGroup) => GetSquareExternalIds(printerGroup.externalIDs).map((x) => x.value))
    .flat();

  if (squareCatalogObjectIds.length > 0) {
    const catalogObjectResponse = await deps.squareService.BatchRetrieveCatalogObjects(squareCatalogObjectIds, false);
    if (catalogObjectResponse.success) {
      const foundObjects = catalogObjectResponse.result.objects as CatalogObject[];
      const missingSquareCatalogObjectBatches: UpdatePrinterGroupProps[] = [];
      Object.values(printerGroups).forEach((x) => {
        const missingIDs = GetSquareExternalIds(x.externalIDs).filter(
          (kv) => foundObjects.findIndex((o) => o.id === kv.value) === -1,
        );
        if (missingIDs.length > 0) {
          missingSquareCatalogObjectBatches.push({
            id: x.id,
            printerGroup: {
              externalIDs: x.externalIDs.filter((kv) => missingIDs.findIndex((idKV) => idKV.value === kv.value) === -1),
            },
          });
        }
      });
      if (missingSquareCatalogObjectBatches.length > 0) {
        await deps.batchUpdatePrinterGroup(missingSquareCatalogObjectBatches);
      }
    }
  }
  const batches = Object.values(printerGroups)
    .filter(
      (pg) =>
        GetSquareIdIndexFromExternalIds(pg.externalIDs, SquareExternalIdKey.CATEGORY) === -1 ||
        GetSquareIdIndexFromExternalIds(pg.externalIDs, SquareExternalIdKey.ITEM) === -1 ||
        GetSquareIdIndexFromExternalIds(pg.externalIDs, SquareExternalIdKey.ITEM_VARIATION) === -1,
    )
    .map((pg) => ({ id: pg.id, printerGroup: {} }));
  return batches.length > 0 ? await deps.batchUpdatePrinterGroup(batches) : null;
};

export const checkAllModifierTypesHaveSquareIdsAndFixIfNeeded = async (deps: SquareSyncDeps) => {
  const updatedModifierTypeIds: string[] = [];

  // 1. check all modifier types for square ids by extracting the external IDs and checking if they exist in square
  const squareCatalogObjectIds = Object.values(deps.catalog.modifiers)
    .map((modifierType) => GetSquareExternalIds(modifierType.externalIDs).map((x) => x.value))
    .flat();

  if (squareCatalogObjectIds.length > 0) {
    const catalogObjectResponse = await deps.squareService.BatchRetrieveCatalogObjects(squareCatalogObjectIds, false);
    if (catalogObjectResponse.success) {
      const foundObjects = catalogObjectResponse.result.objects as CatalogObject[];
      const missingSquareCatalogObjectBatches: UpdateIOptionTypeProps[] = [];
      const optionUpdates: { id: string; modifierTypeId: string; externalIDs: KeyValue[] }[] = [];
      Object.values(deps.catalog.modifiers)
        .filter((mt) =>
          GetSquareExternalIds(mt.externalIDs).reduce(
            (acc, kv) => acc || foundObjects.findIndex((o) => o.id === kv.value) === -1,
            false,
          ),
        )
        .forEach((mt) => {
          missingSquareCatalogObjectBatches.push({
            id: mt.id,
            modifierType: {
              externalIDs: GetNonSquareExternalIds(mt.externalIDs),
            },
          });
          deps.logger.info({ options: mt.options }, 'Pruning square catalog IDs from options');
          optionUpdates.push(
            ...mt.options.map((oId) => ({
              id: oId,
              modifierTypeId: mt.id,
              externalIDs: GetNonSquareExternalIds(deps.catalog.options[oId].externalIDs),
            })),
          );
        });
      // these are the modifier types that we couldn't find the square IDs for
      if (missingSquareCatalogObjectBatches.length > 0) {
        const bulkUpdate = await deps.optionRepository.bulkUpdate(
          optionUpdates.map((x) => ({ id: x.id, data: { externalIDs: x.externalIDs } })),
        );
        deps.logger.info(
          `Bulk upsert of options with square ids scrubbed successful, updated ${bulkUpdate.toString()}`,
        );
        await deps.syncOptions();
        deps.recomputeCatalog();
        const updated = await deps.batchUpdateModifierType(missingSquareCatalogObjectBatches, true, false);
        updatedModifierTypeIds.push(...(updated || []).map((x) => x.id));
        deps.recomputeCatalog();
      }
    }
  }
  const modifierTypeBatches = Object.values(deps.catalog.modifiers)
    .filter(
      (mt) =>
        GetSquareIdIndexFromExternalIds(mt.externalIDs, SquareExternalIdKey.MODIFIER_LIST) === -1 ||
        mt.options.reduce(
          (acc, oId) =>
            acc ||
            GetSquareIdIndexFromExternalIds(deps.catalog.options[oId].externalIDs, SquareExternalIdKey.MODIFIER) === -1,
          false,
        ),
    )
    .map((mt) => ({ id: mt.id, modifierType: {} }));

  if (modifierTypeBatches.length > 0) {
    const result = await deps.batchUpdateModifierType(modifierTypeBatches, true, false);
    if (!result) {
      throw new Error('Failed to update modifier types');
    }
    return result.map((x) => x.id);
  }
  return [];
};

export const checkAllProductsHaveSquareIdsAndFixIfNeeded = async (deps: SquareSyncDeps) => {
  const squareCatalogObjectIds = Object.values(deps.catalog.products)
    .map((p) =>
      p.instances
        .map((piid) => GetSquareExternalIds(deps.catalog.productInstances[piid].externalIDs).map((x) => x.value))
        .flat(),
    )
    .flat();

  if (squareCatalogObjectIds.length > 0) {
    const catalogObjectResponse = await deps.squareService.BatchRetrieveCatalogObjects(squareCatalogObjectIds, false);
    if (catalogObjectResponse.success) {
      const foundObjects = catalogObjectResponse.result.objects as CatalogObject[];
      const missingSquareCatalogObjectBatches = Object.values(deps.catalog.products)
        .map((p) =>
          p.instances
            .filter((x) =>
              GetSquareExternalIds(deps.catalog.productInstances[x].externalIDs).reduce(
                (acc, kv) => acc || foundObjects.findIndex((o) => o.id === kv.value) === -1,
                false,
              ),
            )
            .map((piid) => ({
              piid,
              product: {
                id: p.id,
                modifiers: p.modifiers,
                price: p.price,
                printerGroup: p.printerGroup,
                disabled: p.disabled,
                displayFlags: p.displayFlags,
              },
              productInstance: {
                id: piid,
                externalIDs: GetNonSquareExternalIds(deps.catalog.productInstances[piid].externalIDs),
              },
            })),
        )
        .flat();
      if (missingSquareCatalogObjectBatches.length > 0) {
        await deps.batchUpdateProductInstance(missingSquareCatalogObjectBatches, true);
        await deps.syncProductInstances();
        deps.recomputeCatalog();
      }
    }
  }

  const batches = Object.values(deps.catalog.products)
    .map((p) =>
      p.instances
        .filter((piid) => {
          const pi = deps.catalog.productInstances[piid] as IProductInstance | undefined;
          return (
            pi &&
            !pi.displayFlags.pos.hide &&
            GetSquareIdIndexFromExternalIds(pi.externalIDs, SquareExternalIdKey.ITEM) === -1
          );
        })
        .map((piid) => ({
          piid,
          product: {
            modifiers: p.modifiers,
            price: p.price,
            printerGroup: p.printerGroup,
            disabled: p.disabled,
            displayFlags: p.displayFlags,
          },
          productInstance: { id: piid },
        })),
    )
    .flat();
  if (batches.length > 0) {
    await deps.batchUpdateProductInstance(batches, true);
    await deps.syncProductInstances();
    deps.recomputeCatalog();
  }
};

export const forceSquareCatalogCompleteUpsert = async (deps: SquareSyncDeps) => {
  const printerGroupUpdates = Object.values(deps.printerGroups).map((pg) => ({
    id: pg.id,
    printerGroup: {},
  }));
  await deps.batchUpdatePrinterGroup(printerGroupUpdates);
  const modifierTypeUpdates = Object.values(deps.catalog.modifiers).map((mt) => ({
    id: mt.id,
    modifierType: {},
  }));
  await deps.batchUpdateModifierType(modifierTypeUpdates, true, true);
  await deps.syncModifierTypes();
  await deps.syncOptions();
  await deps.syncProductInstances();
  await deps.syncProducts();
  deps.recomputeCatalog();

  // update all products
  const allProducts = await deps.findAllProducts();
  await deps.batchUpsertProduct(allProducts);
  deps.recomputeCatalog();

  await deps.syncModifierTypes();
  await deps.syncOptions();
  await deps.syncProductInstances();
  await deps.syncProducts();
  deps.recomputeCatalog();
};
