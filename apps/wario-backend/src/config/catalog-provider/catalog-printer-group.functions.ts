/* eslint-disable @typescript-eslint/restrict-plus-operands */
/**
 * Pure functions for printer group CRUD operations.
 */
import type { FilterQuery, Model } from 'mongoose';
import type { PinoLogger } from 'nestjs-pino';
import type { CatalogObject } from 'square';

import type { DeletePrinterGroupRequest, IProduct, KeyValue, PrinterGroup } from '@wcp/wario-shared';

import { toPartialUpdateQuery } from 'src/utils/partial-update';

import { PrinterGroupNotFoundException } from 'src/exceptions';

import type { DataProviderService } from '../data-provider/data-provider.service';
import {
  GetSquareExternalIds,
  IdMappingsToExternalIds,
  PrinterGroupToSquareCatalogObjectPlusDummyProduct,
} from '../square-wario-bridge';
import type { SquareService } from '../square/square.service';

import type { UpdatePrinterGroupProps } from './catalog.types';

export type { UpdatePrinterGroupProps };

// ============================================================================
// Dependencies Interface

// ============================================================================

export interface PrinterGroupDeps {
  wPrinterGroupModel: Model<PrinterGroup>;
  logger: PinoLogger;
  squareService: SquareService;
  dataProviderService: DataProviderService;

  printerGroups: Record<string, PrinterGroup>; // State

  syncPrinterGroups: () => Promise<boolean>;
  batchDeleteCatalogObjectsFromExternalIds: (ids: KeyValue[]) => Promise<unknown>;
  updateProductsWithConstraint: (
    match: FilterQuery<IProduct>,
    update: Partial<IProduct>,
    force: boolean,
  ) => Promise<unknown>;
}

// ============================================================================
// Operations

// ============================================================================

export const createPrinterGroup = async (deps: PrinterGroupDeps, printerGroup: Omit<PrinterGroup, 'id'>) => {
  deps.logger.info({ printerGroup }, 'Creating Printer Group');
  const upsertResponse = await deps.squareService.BatchUpsertCatalogObjects([
    {
      objects: PrinterGroupToSquareCatalogObjectPlusDummyProduct(
        [deps.dataProviderService.KeyValueConfig.SQUARE_LOCATION_ALTERNATE], // this ONLY goes to the alternate location since we can't purchase messages
        printerGroup,
        [],
        '',
      ),
    },
  ]);
  if (!upsertResponse.success) {
    deps.logger.error({ errors: upsertResponse.error }, 'Failed to add square category');
    return null;
  }

  const doc = new deps.wPrinterGroupModel({
    ...printerGroup,
    externalIDs: [...printerGroup.externalIDs, ...IdMappingsToExternalIds(upsertResponse.result.idMappings, '')],
  });
  await doc.save();
  await deps.syncPrinterGroups();
  return doc.toObject();
};

export const batchUpdatePrinterGroup = async (
  deps: PrinterGroupDeps,
  batches: UpdatePrinterGroupProps[],
): Promise<(PrinterGroup | null)[]> => {
  deps.logger.info(
    { batches: batches.map((x) => ({ id: x.id, changes: x.printerGroup })) },
    'Updating printer group(s)',
  );

  const oldPGs = batches.map((b) => deps.printerGroups[b.id]);
  const newExternalIdses = batches.map((b, i) => b.printerGroup.externalIDs ?? oldPGs[i].externalIDs);
  const existingSquareExternalIds = newExternalIdses.map((ids) => GetSquareExternalIds(ids)).flat();
  let existingSquareObjects: CatalogObject[] = [];
  if (existingSquareExternalIds.length > 0) {
    const batchRetrieveCatalogObjectsResponse = await deps.squareService.BatchRetrieveCatalogObjects(
      existingSquareExternalIds.map((x) => x.value),
      false,
    );
    if (!batchRetrieveCatalogObjectsResponse.success) {
      deps.logger.error(
        { errors: batchRetrieveCatalogObjectsResponse.error },
        'Getting current square CatalogObjects failed',
      );
      return batches.map((_) => null);
    }
    existingSquareObjects = batchRetrieveCatalogObjectsResponse.result.objects ?? [];
  }

  const catalogObjects = batches.map((b, i) =>
    PrinterGroupToSquareCatalogObjectPlusDummyProduct(
      [deps.dataProviderService.KeyValueConfig.SQUARE_LOCATION_ALTERNATE], // message only needs to go to the alternate location
      { ...oldPGs[i], ...b.printerGroup },
      existingSquareObjects,
      ('000' + i).slice(-3),
    ),
  );
  const upsertResponse = await deps.squareService.BatchUpsertCatalogObjects(
    catalogObjects.map((x) => ({ objects: x })),
  );
  if (!upsertResponse.success) {
    deps.logger.error({ errors: upsertResponse.error }, 'Failed to update square categories');
    return batches.map((_) => null);
  }

  const mappings = upsertResponse.result.idMappings;

  const updated = await Promise.all(
    batches.map(async (b, i) => {
      const doc = await deps.wPrinterGroupModel
        .findByIdAndUpdate(
          b.id,
          toPartialUpdateQuery<PrinterGroup>({
            ...b.printerGroup,
            externalIDs: [...newExternalIdses[i], ...IdMappingsToExternalIds(mappings, ('000' + i).slice(-3))],
          }),
          { new: true },
        )
        .exec();
      if (!doc) {
        return null;
      }
      return doc.toObject();
    }),
  );

  void deps.syncPrinterGroups();
  return updated;
};

export const updatePrinterGroup = async (deps: PrinterGroupDeps, props: UpdatePrinterGroupProps) => {
  return (await batchUpdatePrinterGroup(deps, [props]))[0];
};

export const deletePrinterGroup = async (
  deps: PrinterGroupDeps,
  request: DeletePrinterGroupRequest & { id: string },
) => {
  deps.logger.debug(`Removing Printer Group ${request.id}`);
  if (request.reassign) {
    const dest = await deps.wPrinterGroupModel.findById(request.printerGroup).exec();
    if (!dest) {
      deps.logger.error(`Printer Group with ID ${request.printerGroup} not found`);
      throw new PrinterGroupNotFoundException(request.printerGroup);
    }
  }
  const doc = await deps.wPrinterGroupModel.findByIdAndDelete(request.id).exec();
  if (!doc) {
    deps.logger.error(`Printer Group with ID ${request.id} not found`);
    throw new PrinterGroupNotFoundException(request.id);
  }

  // NOTE: this removes the category from the Square ITEMs as well
  await deps.batchDeleteCatalogObjectsFromExternalIds(doc.externalIDs);

  await deps.syncPrinterGroups();

  // needs to write batch update product
  await deps.updateProductsWithConstraint(
    { printerGroup: request.id },
    { printerGroup: request.reassign ? request.printerGroup : null },
    false,
  );
  return doc.toObject();
};
