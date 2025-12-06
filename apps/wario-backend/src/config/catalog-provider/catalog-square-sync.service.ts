import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogObject } from 'square';

import { IOptionType, KeyValue } from '@wcp/wario-shared';

import {
  GetNonSquareExternalIds,
  GetSquareExternalIds,
  GetSquareIdIndexFromExternalIds,
} from '../square-wario-bridge';
import { SquareService } from '../square/square.service';

import { CatalogModifierService } from './catalog-modifier.service';
import { CatalogPrinterGroupService } from './catalog-printer-group.service';
import { CatalogProductService } from './catalog-product.service';
import { CatalogProviderService } from './catalog-provider.service';
import { UpdateModifierTypeProps, UpdatePrinterGroupProps } from './catalog.types';

@Injectable()
export class CatalogSquareSyncService {
  constructor(
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogProvider: CatalogProviderService,
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
    @Inject(forwardRef(() => CatalogPrinterGroupService))
    private catalogPrinterGroupService: CatalogPrinterGroupService,
    @Inject(forwardRef(() => CatalogModifierService))
    private catalogModifierService: CatalogModifierService,
    @Inject(forwardRef(() => CatalogProductService))
    private catalogProductService: CatalogProductService,
    @InjectPinoLogger(CatalogSquareSyncService.name)
    private readonly logger: PinoLogger,
  ) { }

  BatchDeleteCatalogObjectsFromExternalIds = async (externalIds: KeyValue[]) => {
    const squareKV = GetSquareExternalIds(externalIds);
    if (squareKV.length > 0) {
      this.logger.debug(`Removing from square... ${squareKV.map((x) => `${x.key}: ${x.value}`).join(', ')}`);
      return await this.squareService.BatchDeleteCatalogObjects(squareKV.map((x) => x.value));
    }
    return true;
  };

  CheckAllPrinterGroupsSquareIdsAndFixIfNeeded = async () => {
    const squareCatalogObjectIds = Object.values(this.catalogProvider.PrinterGroups)
      .map((printerGroup) => GetSquareExternalIds(printerGroup.externalIDs).map((x) => x.value))
      .flat();
    if (squareCatalogObjectIds.length > 0) {
      const catalogObjectResponse = await this.squareService.BatchRetrieveCatalogObjects(squareCatalogObjectIds, false);
      if (catalogObjectResponse.success) {
        const foundObjects = catalogObjectResponse.result.objects as CatalogObject[];
        const missingSquareCatalogObjectBatches: UpdatePrinterGroupProps[] = [];
        Object.values(this.catalogProvider.PrinterGroups).forEach((x) => {
          const missingIDs = GetSquareExternalIds(x.externalIDs).filter(
            (kv) => foundObjects.findIndex((o) => o.id === kv.value) === -1,
          );
          if (missingIDs.length > 0) {
            missingSquareCatalogObjectBatches.push({
              id: x.id,
              printerGroup: {
                externalIDs: x.externalIDs.filter(
                  (kv) => missingIDs.findIndex((idKV) => idKV.value === kv.value) === -1,
                ),
              },
            });
          }
        });
        if (missingSquareCatalogObjectBatches.length > 0) {
          await this.catalogPrinterGroupService.BatchUpdatePrinterGroup(missingSquareCatalogObjectBatches);
        }
      }
    }
    const batches = Object.values(this.catalogProvider.PrinterGroups)
      .filter(
        (pg) =>
          GetSquareIdIndexFromExternalIds(pg.externalIDs, 'CATEGORY') === -1 ||
          GetSquareIdIndexFromExternalIds(pg.externalIDs, 'ITEM') === -1 ||
          GetSquareIdIndexFromExternalIds(pg.externalIDs, 'ITEM_VARIATION') === -1,
      )
      .map((pg) => ({ id: pg.id, printerGroup: {} }));
    return batches.length > 0 ? await this.catalogPrinterGroupService.BatchUpdatePrinterGroup(batches) : null;
  };

  CheckAllModifierTypesHaveSquareIdsAndFixIfNeeded = async () => {
    const squareCatalogObjectIds = Object.values(this.catalogProvider.Catalog.modifiers)
      .map((modifierTypeEntry) => GetSquareExternalIds(modifierTypeEntry.modifierType.externalIDs).map((x) => x.value))
      .flat();
    if (squareCatalogObjectIds.length > 0) {
      const catalogObjectResponse = await this.squareService.BatchRetrieveCatalogObjects(squareCatalogObjectIds, false);
      if (catalogObjectResponse.success) {
        const foundObjects = catalogObjectResponse.result.objects as CatalogObject[];
        const missingSquareCatalogObjectBatches: UpdateModifierTypeProps[] = [];
        const optionUpdates: { id: string; externalIDs: KeyValue[] }[] = [];
        Object.values(this.catalogProvider.Catalog.modifiers)
          .filter((x) =>
            GetSquareExternalIds(x.modifierType.externalIDs).reduce(
              (acc, kv) => acc || foundObjects.findIndex((o) => o.id === kv.value) === -1,
              false,
            ),
          )
          .forEach((x) => {
            missingSquareCatalogObjectBatches.push({
              id: x.modifierType.id,
              modifierType: {
                externalIDs: GetNonSquareExternalIds(x.modifierType.externalIDs),
              },
            });
            this.logger.info(`Pruning square catalog IDs from options: ${x.options.join(', ')}`);
            optionUpdates.push(
              ...x.options.map((oId) => ({
                id: oId,
                externalIDs: GetNonSquareExternalIds(this.catalogProvider.Catalog.options[oId].externalIDs),
              })),
            );
          });
        if (missingSquareCatalogObjectBatches.length > 0) {
          await this.catalogModifierService.BatchUpdateModifierType(missingSquareCatalogObjectBatches, false, false);
        }
        if (optionUpdates.length > 0) {
          await this.catalogModifierService.BatchUpdateModifierOption(
            optionUpdates.map((x) => ({
              id: x.id,
              modifierTypeId: this.catalogProvider.Catalog.options[x.id].modifierTypeId,
              modifierOption: { externalIDs: x.externalIDs },
            })),
          );
        }
      }
    }
    const batches = Object.values(this.catalogProvider.Catalog.modifiers)
      .filter(
        (x) =>
          GetSquareIdIndexFromExternalIds(x.modifierType.externalIDs, 'MODIFIER_LIST') === -1 ||
          x.options.reduce(
            (acc, oId) =>
              acc || GetSquareIdIndexFromExternalIds(this.catalogProvider.Catalog.options[oId].externalIDs, 'MODIFIER') === -1,
            false,
          ),
      )
      .map((x) => ({ id: x.modifierType.id, modifierType: {} }));

    if (batches.length > 0) {
      const result = await this.catalogModifierService.BatchUpdateModifierType(batches, false, false);
      return result.filter((x): x is IOptionType => x !== null).map((x) => x.id);
    }
    return [];
  };

  CheckAllProductsHaveSquareIdsAndFixIfNeeded = async () => {
    const squareCatalogObjectIds = Object.values(this.catalogProvider.Catalog.products)
      .map((p) =>
        p.instances
          .map((piid) => GetSquareExternalIds(this.catalogProvider.Catalog.productInstances[piid].externalIDs).map((x) => x.value))
          .flat(),
      )
      .flat();
    if (squareCatalogObjectIds.length > 0) {
      const catalogObjectResponse = await this.squareService.BatchRetrieveCatalogObjects(squareCatalogObjectIds, false);
      if (catalogObjectResponse.success) {
        const foundObjects = catalogObjectResponse.result.objects as CatalogObject[];
        const missingSquareCatalogObjectBatches = Object.values(this.catalogProvider.Catalog.products)
          .map((p) =>
            p.instances
              .filter((x) =>
                GetSquareExternalIds(this.catalogProvider.Catalog.productInstances[x].externalIDs).reduce(
                  (acc, kv) => acc || foundObjects.findIndex((o) => o.id === kv.value) === -1,
                  false,
                ),
              )
              .map((piid) => ({
                piid,
                product: {
                  modifiers: p.product.modifiers,
                  price: p.product.price,
                  printerGroup: p.product.printerGroup,
                  disabled: p.product.disabled,
                  displayFlags: p.product.displayFlags,
                },
                productInstance: {
                  externalIDs: GetNonSquareExternalIds(this.catalogProvider.Catalog.productInstances[piid].externalIDs),
                },
              })),
          )
          .flat();
        if (missingSquareCatalogObjectBatches.length > 0) {
          await this.catalogProductService.BatchUpdateProductInstance(missingSquareCatalogObjectBatches, true);
          await this.catalogProvider.SyncProductInstances();
          this.catalogProvider.RecomputeCatalog();
        }
      }
    }

    const batches = Object.values(this.catalogProvider.Catalog.products)
      .map((p) =>
        p.instances
          .filter((piid) => {
            const pi = this.catalogProvider.Catalog.productInstances[piid];
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            return pi && !pi.displayFlags.pos.hide && GetSquareIdIndexFromExternalIds(pi.externalIDs, 'ITEM') === -1;
          })
          .map((piid) => ({
            piid,
            product: {
              modifiers: p.product.modifiers,
              price: p.product.price,
              printerGroup: p.product.printerGroup,
              disabled: p.product.disabled,
              displayFlags: p.product.displayFlags,
            },
            productInstance: {},
          })),
      )
      .flat();
    if (batches.length > 0) {
      await this.catalogProductService.BatchUpdateProductInstance(batches, true);
      await this.catalogProvider.SyncProductInstances();
      this.catalogProvider.RecomputeCatalog();
    }
  };

  ForceSquareCatalogCompleteUpsert = async () => {
    const printerGroupUpdates = Object.values(this.catalogProvider.PrinterGroups).map((pg) => ({
      id: pg.id,
      printerGroup: {},
    }));
    await this.catalogPrinterGroupService.BatchUpdatePrinterGroup(printerGroupUpdates);
    const modifierTypeUpdates = Object.values(this.catalogProvider.Catalog.modifiers).map((x) => ({
      id: x.modifierType.id,
      modifierType: {},
    }));
    await this.catalogModifierService.BatchUpdateModifierType(modifierTypeUpdates, true, true);
    void this.catalogProvider.SyncModifierTypes();
    void this.catalogProvider.SyncOptions();
    void this.catalogProvider.SyncProductInstances();
    void this.catalogProvider.SyncProducts();
    this.catalogProvider.RecomputeCatalog();

    await this.catalogProvider.UpdateProductsWithConstraint({}, {}, true);
    void this.catalogProvider.SyncModifierTypes();
    void this.catalogProvider.SyncOptions();
    void this.catalogProvider.SyncProductInstances();
    void this.catalogProvider.SyncProducts();
    this.catalogProvider.RecomputeCatalog();
  };
}

