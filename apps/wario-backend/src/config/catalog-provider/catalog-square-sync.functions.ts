/**
 * Pure functions for catalog square synchronization operations.
 */
import type { PinoLogger } from 'nestjs-pino';
import type { CatalogObject } from 'square';

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

import { GetNonSquareExternalIds, GetSquareExternalIds, GetSquareIdIndexFromExternalIds } from '../square-wario-bridge';
import type { SquareService } from '../square/square.service';

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
        GetSquareIdIndexFromExternalIds(pg.externalIDs, 'CATEGORY') === -1 ||
        GetSquareIdIndexFromExternalIds(pg.externalIDs, 'ITEM') === -1 ||
        GetSquareIdIndexFromExternalIds(pg.externalIDs, 'ITEM_VARIATION') === -1,
    )
    .map((pg) => ({ id: pg.id, printerGroup: {} }));
  return batches.length > 0 ? await deps.batchUpdatePrinterGroup(batches) : null;
};

export const checkAllModifierTypesHaveSquareIdsAndFixIfNeeded = async (deps: SquareSyncDeps) => {
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
          deps.logger.info(`Pruning square catalog IDs from options: ${mt.options.join(', ')}`);
          optionUpdates.push(
            ...mt.options.map((oId) => ({
              id: oId,
              modifierTypeId: mt.id,
              externalIDs: GetNonSquareExternalIds(deps.catalog.options[oId].externalIDs),
            })),
          );
        });
      if (missingSquareCatalogObjectBatches.length > 0) {
        await deps.batchUpdateModifierType(missingSquareCatalogObjectBatches, false, false);
      }
      if (optionUpdates.length > 0) {
        await deps.batchUpdateModifierOption(
          optionUpdates.map((x) => ({
            id: x.id,
            modifierTypeId: x.modifierTypeId,
            option: { externalIDs: x.externalIDs },
          })),
        );
      }
    }
  }
  const batches = Object.values(deps.catalog.modifiers)
    .filter(
      (mt) =>
        GetSquareIdIndexFromExternalIds(mt.externalIDs, 'MODIFIER_LIST') === -1 ||
        mt.options.reduce(
          (acc, oId) =>
            acc || GetSquareIdIndexFromExternalIds(deps.catalog.options[oId].externalIDs, 'MODIFIER') === -1,
          false,
        ),
    )
    .map((mt) => ({ id: mt.id, modifierType: {} }));

  if (batches.length > 0) {
    const result = await deps.batchUpdateModifierType(batches, false, false);
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
          const pi = deps.catalog.productInstances[piid];
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          return pi && !pi.displayFlags.pos.hide && GetSquareIdIndexFromExternalIds(pi.externalIDs, 'ITEM') === -1;
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
  void deps.syncModifierTypes();
  void deps.syncOptions();
  void deps.syncProductInstances();
  void deps.syncProducts();
  deps.recomputeCatalog();

  // update all products
  const allProducts = await deps.findAllProducts();
  await deps.batchUpsertProduct(allProducts);
  deps.recomputeCatalog();

  void deps.syncModifierTypes();
  void deps.syncOptions();
  void deps.syncProductInstances();
  void deps.syncProducts();
  deps.recomputeCatalog();
};
