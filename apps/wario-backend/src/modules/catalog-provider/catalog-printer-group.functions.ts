/* eslint-disable @typescript-eslint/restrict-plus-operands */
/**
 * Pure functions for printer group CRUD operations.
 */
import type { PinoLogger } from 'nestjs-pino';
import type { BatchDeleteCatalogObjectsResponse, CatalogObject } from 'square/legacy';

import type { DeletePrinterGroupRequest, KeyValue, PrinterGroup } from '@wcp/wario-shared';

import {
  GetSquareExternalIds,
  IdMappingsToExternalIds,
  PrinterGroupToSquareCatalogObjectPlusDummyProduct,
} from 'src/config/square-wario-bridge';
import { PrinterGroupNotFoundException } from 'src/exceptions';
import type { DataProviderService } from 'src/modules/data-provider/data-provider.service';

import type { IPrinterGroupRepository } from '../../repositories/interfaces/printer-group.repository.interface';
import type { SquareProviderApiCallReturnValue, SquareService } from '../integrations/square/square.service';

import type { UpdatePrinterGroupProps } from './catalog.types';

export type { UpdatePrinterGroupProps };

// ============================================================================
// Dependencies Interface

// ============================================================================

export interface PrinterGroupDeps {
  printerGroupRepository: IPrinterGroupRepository;
  logger: PinoLogger;
  squareService: SquareService;
  dataProviderService: DataProviderService;

  printerGroups: Record<string, PrinterGroup>; // State

  syncPrinterGroups: () => Promise<boolean>;
  batchDeleteCatalogObjectsFromExternalIds: (
    ids: KeyValue[],
  ) => Promise<true | SquareProviderApiCallReturnValue<BatchDeleteCatalogObjectsResponse>>;
  reassignPrinterGroupForAllProducts: (oldId: string, newId: string | null) => Promise<number>;
}

// ============================================================================
// Operations

// ============================================================================

export const createPrinterGroup = async (deps: PrinterGroupDeps, printerGroup: Omit<PrinterGroup, 'id'>) => {
  deps.logger.info({ printerGroup }, 'Creating Printer Group');
  const upsertResponse = await deps.squareService.BatchUpsertCatalogObjects([
    {
      objects: PrinterGroupToSquareCatalogObjectPlusDummyProduct(
        [deps.dataProviderService.getKeyValueConfig().SQUARE_LOCATION_ALTERNATE], // this ONLY goes to the alternate location since we can't purchase messages
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

  const created = await deps.printerGroupRepository.create({
    ...printerGroup,
    externalIDs: [...printerGroup.externalIDs, ...IdMappingsToExternalIds(upsertResponse.result.idMappings, '')],
  });
  await deps.syncPrinterGroups();
  return created;
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
      [deps.dataProviderService.getKeyValueConfig().SQUARE_LOCATION_ALTERNATE], // message only needs to go to the alternate location
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
      const updatedPG = await deps.printerGroupRepository.update(b.id, {
        ...b.printerGroup,
        externalIDs: [...newExternalIdses[i], ...IdMappingsToExternalIds(mappings, ('000' + i).slice(-3))],
      });
      return updatedPG;
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
    const dest = await deps.printerGroupRepository.findById(request.printerGroup);
    if (!dest) {
      deps.logger.error(`Printer Group with ID ${request.printerGroup} not found`);
      throw new PrinterGroupNotFoundException(request.printerGroup);
    }
  }

  const existing = await deps.printerGroupRepository.findById(request.id);
  if (!existing) {
    deps.logger.error(`Printer Group with ID ${request.id} not found`);
    throw new PrinterGroupNotFoundException(request.id);
  }

  const deleted = await deps.printerGroupRepository.delete(request.id);
  if (!deleted) {
    deps.logger.error(`Printer Group with ID ${request.id} not found`);
    throw new PrinterGroupNotFoundException(request.id);
  }

  // NOTE: this removes the category from the Square ITEMs as well
  await deps.batchDeleteCatalogObjectsFromExternalIds(existing.externalIDs);

  await deps.syncPrinterGroups();

  // needs to write batch update product
  await deps.reassignPrinterGroupForAllProducts(request.id, request.reassign ? request.printerGroup : null);
  return existing;
};
