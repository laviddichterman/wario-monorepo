/**
 * Unit tests for catalog-printer-group.functions.ts
 *
 * Tests the pure functions for PrinterGroup CRUD operations including Square integration.
 */
/* eslint-disable @typescript-eslint/unbound-method */

import type {
  DeletePrinterGroupNoReassignRequest,
  DeletePrinterGroupReassignRequest,
  PrinterGroup,
} from '@wcp/wario-shared';

import { createMockPrinterGroupDeps, createSquareSuccessResponse } from '../../../test/utils';
import { PrinterGroupNotFoundException } from '../../exceptions';

import {
  batchUpdatePrinterGroup,
  createPrinterGroup,
  deletePrinterGroup,
  updatePrinterGroup,
} from './catalog-printer-group.functions';

// ============================================================================
// Type Assertion Helpers
// ============================================================================

function assertIsPrinterGroup(value: unknown): asserts value is PrinterGroup {
  const pg = value as PrinterGroup;
  expect(pg).toHaveProperty('id');
  expect(pg).toHaveProperty('name');
  expect(pg).toHaveProperty('externalIDs');
}

// ============================================================================
// Mock Data Factories
// ============================================================================

function createMockPrinterGroupInput(): Omit<PrinterGroup, 'id'> {
  return {
    name: 'Test Printer Group',
    singleItemPerTicket: false,
    isExpo: false,
    externalIDs: [],
  };
}

function createMockPrinterGroupEntity(id = 'pg-1', overrides: Partial<PrinterGroup> = {}): PrinterGroup {
  return {
    id,
    name: 'Test Printer Group',
    singleItemPerTicket: false,
    isExpo: false,
    externalIDs: [],
    ...overrides,
  };
}

// ============================================================================
// createPrinterGroup Tests
// ============================================================================

describe('createPrinterGroup', () => {
  it('should create printer group and sync with Square', async () => {
    const deps = createMockPrinterGroupDeps();
    const input = createMockPrinterGroupInput();
    const expected = { id: 'new-pg-id', ...input, externalIDs: [{ key: 'CATEGORY', value: 'sq-cat-id' }] };

    (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
      createSquareSuccessResponse({
        objects: [],
        idMappings: [{ clientObjectId: '#cat_', objectId: 'sq-cat-id' }],
      }),
    );
    (deps.printerGroupRepository.create as jest.Mock).mockResolvedValue(expected);

    const result = await createPrinterGroup(deps, input);

    assertIsPrinterGroup(result);
    expect(result.id).toBe('new-pg-id');
    expect(deps.squareService.BatchUpsertCatalogObjects).toHaveBeenCalled();
    expect(deps.syncPrinterGroups).toHaveBeenCalled();
  });

  it('should return null when Square upsert fails', async () => {
    const deps = createMockPrinterGroupDeps();
    const input = createMockPrinterGroupInput();

    (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue({
      success: false,
      error: { errors: [{ detail: 'Square API error' }] },
    });

    const result = await createPrinterGroup(deps, input);

    expect(result).toBeNull();
    expect(deps.printerGroupRepository.create).not.toHaveBeenCalled();
    expect(deps.syncPrinterGroups).not.toHaveBeenCalled();
  });
});

// ============================================================================
// updatePrinterGroup Tests
// ============================================================================

describe('updatePrinterGroup', () => {
  it('should update printer group and sync external IDs', async () => {
    const printerGroups = {
      'pg-1': createMockPrinterGroupEntity('pg-1'),
    };
    const deps = createMockPrinterGroupDeps({ printerGroups });
    const updates = { name: 'Updated Printer Group' };
    const expected = createMockPrinterGroupEntity('pg-1', { name: 'Updated Printer Group' });

    (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
      createSquareSuccessResponse({ objects: [] }),
    );
    (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
      createSquareSuccessResponse({ objects: [], idMappings: [] }),
    );
    (deps.printerGroupRepository.update as jest.Mock).mockResolvedValue(expected);

    const result = await updatePrinterGroup(deps, { id: 'pg-1', printerGroup: updates });

    assertIsPrinterGroup(result);
    expect(result.name).toBe('Updated Printer Group');
    expect(deps.syncPrinterGroups).toHaveBeenCalled();
  });

  it('should return null when Square retrieve fails', async () => {
    const printerGroups = {
      'pg-1': createMockPrinterGroupEntity('pg-1', {
        externalIDs: [{ key: 'CATEGORY', value: 'sq-cat-id' }],
      }),
    };
    const deps = createMockPrinterGroupDeps({ printerGroups });

    (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue({
      success: false,
      error: { errors: [{ detail: 'Square API error' }] },
    });

    const result = await updatePrinterGroup(deps, { id: 'pg-1', printerGroup: { name: 'New Name' } });

    expect(result).toBeNull();
  });
});

// ============================================================================
// batchUpdatePrinterGroup Tests
// ============================================================================

describe('batchUpdatePrinterGroup', () => {
  it('should update multiple printer groups in batch', async () => {
    const printerGroups = {
      'pg-1': createMockPrinterGroupEntity('pg-1', { name: 'Printer 1' }),
      'pg-2': createMockPrinterGroupEntity('pg-2', { name: 'Printer 2' }),
    };
    const deps = createMockPrinterGroupDeps({ printerGroups });

    (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
      createSquareSuccessResponse({ objects: [] }),
    );
    (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
      createSquareSuccessResponse({ objects: [], idMappings: [] }),
    );
    (deps.printerGroupRepository.update as jest.Mock)
      .mockResolvedValueOnce(createMockPrinterGroupEntity('pg-1', { name: 'Updated 1' }))
      .mockResolvedValueOnce(createMockPrinterGroupEntity('pg-2', { name: 'Updated 2' }));

    const batches = [
      { id: 'pg-1', printerGroup: { name: 'Updated 1' } },
      { id: 'pg-2', printerGroup: { name: 'Updated 2' } },
    ];

    const result = await batchUpdatePrinterGroup(deps, batches);

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe('Updated 1');
    expect(result[1]?.name).toBe('Updated 2');
    expect(deps.printerGroupRepository.update).toHaveBeenCalledTimes(2);
    expect(deps.syncPrinterGroups).toHaveBeenCalled();
  });

  it('should return all nulls when Square upsert fails', async () => {
    const printerGroups = {
      'pg-1': createMockPrinterGroupEntity('pg-1'),
    };
    const deps = createMockPrinterGroupDeps({ printerGroups });

    (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
      createSquareSuccessResponse({ objects: [] }),
    );
    (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue({
      success: false,
      error: { errors: [{ detail: 'Square API error' }] },
    });

    const result = await batchUpdatePrinterGroup(deps, [{ id: 'pg-1', printerGroup: { name: 'New' } }]);

    expect(result).toEqual([null]);
    expect(deps.printerGroupRepository.update).not.toHaveBeenCalled();
  });
});

// ============================================================================
// deletePrinterGroup Tests
// ============================================================================

describe('deletePrinterGroup', () => {
  it('should delete printer group and reassign products when requested', async () => {
    const printerGroups = {
      'pg-1': createMockPrinterGroupEntity('pg-1', { externalIDs: [{ key: 'CATEGORY', value: 'sq-cat' }] }),
      'pg-2': createMockPrinterGroupEntity('pg-2', { name: 'Destination' }),
    };
    const deps = createMockPrinterGroupDeps({ printerGroups });

    (deps.printerGroupRepository.findById as jest.Mock)
      .mockResolvedValueOnce(printerGroups['pg-2']) // destination check
      .mockResolvedValueOnce(printerGroups['pg-1']); // existing to delete
    (deps.printerGroupRepository.delete as jest.Mock).mockResolvedValue(true);

    const request: DeletePrinterGroupReassignRequest & { id: string } = {
      id: 'pg-1',
      reassign: true,
      printerGroup: 'pg-2',
    };

    const result = await deletePrinterGroup(deps, request);

    assertIsPrinterGroup(result);
    expect(result.id).toBe('pg-1');
    expect(deps.batchDeleteCatalogObjectsFromExternalIds).toHaveBeenCalledWith([{ key: 'CATEGORY', value: 'sq-cat' }]);
    expect(deps.reassignPrinterGroupForAllProducts).toHaveBeenCalledWith('pg-1', 'pg-2');
    expect(deps.syncPrinterGroups).toHaveBeenCalled();
  });

  it('should delete printer group without reassignment', async () => {
    const printerGroups = {
      'pg-1': createMockPrinterGroupEntity('pg-1', { externalIDs: [] }),
    };
    const deps = createMockPrinterGroupDeps({ printerGroups });

    (deps.printerGroupRepository.findById as jest.Mock).mockResolvedValue(printerGroups['pg-1']);
    (deps.printerGroupRepository.delete as jest.Mock).mockResolvedValue(true);

    const request: DeletePrinterGroupNoReassignRequest & { id: string } = {
      id: 'pg-1',
      reassign: false,
    };

    const result = await deletePrinterGroup(deps, request);

    assertIsPrinterGroup(result);
    expect(deps.reassignPrinterGroupForAllProducts).toHaveBeenCalledWith('pg-1', null);
  });

  it('should throw PrinterGroupNotFoundException when destination does not exist', async () => {
    const printerGroups = {
      'pg-1': createMockPrinterGroupEntity('pg-1'),
    };
    const deps = createMockPrinterGroupDeps({ printerGroups });

    (deps.printerGroupRepository.findById as jest.Mock).mockResolvedValue(null);

    const request: DeletePrinterGroupReassignRequest & { id: string } = {
      id: 'pg-1',
      reassign: true,
      printerGroup: 'non-existent',
    };

    await expect(deletePrinterGroup(deps, request)).rejects.toThrow(PrinterGroupNotFoundException);
  });

  it('should throw PrinterGroupNotFoundException when printer group to delete does not exist', async () => {
    const deps = createMockPrinterGroupDeps();

    (deps.printerGroupRepository.findById as jest.Mock).mockResolvedValue(null);

    const request: DeletePrinterGroupNoReassignRequest & { id: string } = {
      id: 'non-existent',
      reassign: false,
    };

    await expect(deletePrinterGroup(deps, request)).rejects.toThrow(PrinterGroupNotFoundException);
  });

  it('should throw PrinterGroupNotFoundException when delete fails', async () => {
    const printerGroups = {
      'pg-1': createMockPrinterGroupEntity('pg-1'),
    };
    const deps = createMockPrinterGroupDeps({ printerGroups });

    (deps.printerGroupRepository.findById as jest.Mock).mockResolvedValue(printerGroups['pg-1']);
    (deps.printerGroupRepository.delete as jest.Mock).mockResolvedValue(false);

    const request: DeletePrinterGroupNoReassignRequest & { id: string } = {
      id: 'pg-1',
      reassign: false,
    };

    await expect(deletePrinterGroup(deps, request)).rejects.toThrow(PrinterGroupNotFoundException);
  });
});
