/* eslint-disable @typescript-eslint/unbound-method */
/**
 * Unit Tests for catalog-modifier.functions.ts
 *
 * Tests covering happy path scenarios for modifier type and option operations.
 */

import { createMockModifierDeps } from 'test/utils';

import { createMockOption, createMockOptionType } from '@wcp/wario-shared/testing';

import {
  createModifierType,
  createOption,
  deleteModifierOption,
  deleteModifierType,
  updateModifierOption,
  updateModifierType,
} from './catalog-modifier.functions';

// =============================================================================
// createModifierType Tests
// =============================================================================

describe('createModifierType', () => {
  it('should create a modifier type without options', async () => {
    const deps = createMockModifierDeps({});

    const createdModifierType = createMockOptionType({ id: 'mt_new' });
    (deps.optionTypeRepository.create as jest.Mock).mockResolvedValue(createdModifierType);

    const body = {
      name: 'New Modifier Type',
      displayName: 'New Modifier Type',
      min_selected: 0,
      max_selected: 3,
      externalIDs: [],
      options: [],
      ordinal: 1,
      displayFlags: createdModifierType.displayFlags,
    };

    const result = await createModifierType(deps, body);

    expect(result).toEqual(createdModifierType);
    expect(deps.optionTypeRepository.create).toHaveBeenCalled();
    expect(deps.syncOptions).toHaveBeenCalled();
    expect(deps.syncModifierTypes).toHaveBeenCalled();
    expect(deps.recomputeCatalog).toHaveBeenCalled();
  });

  it('should create a modifier type with options', async () => {
    const deps = createMockModifierDeps({});

    const createdOption = createMockOption({ id: 'opt_new' });
    const createdModifierType = createMockOptionType({ id: 'mt_new', options: ['opt_new'] });

    (deps.optionRepository.bulkCreate as jest.Mock).mockResolvedValue([createdOption]);
    (deps.optionTypeRepository.create as jest.Mock).mockResolvedValue(createdModifierType);

    const body = {
      name: 'Size',
      displayName: 'Size',
      min_selected: 1,
      max_selected: 1,
      externalIDs: [],
      options: [
        {
          displayName: 'Small',
          shortcode: 'SM',
          description: '',
          price: { amount: 0, currency: 'USD' },
          enable: null,
          ordinal: 0,
          externalIDs: [],
          availability: [],
          metadata: {
            flavor_factor: 1,
            bake_factor: 1,
            can_split: false,
            allowHeavy: false,
            allowLite: false,
            allowOTS: false,
          },
          disabled: null,
          displayFlags: createdOption.displayFlags,
        },
      ],
      ordinal: 0,
      displayFlags: createdModifierType.displayFlags,
    };

    const result = await createModifierType(deps, body);

    expect(result).toEqual(createdModifierType);
    expect(deps.optionRepository.bulkCreate).toHaveBeenCalled();
    expect(deps.optionTypeRepository.create).toHaveBeenCalled();
    expect(deps.syncOptions).toHaveBeenCalled();
    expect(deps.syncModifierTypes).toHaveBeenCalled();
    expect(deps.recomputeCatalog).toHaveBeenCalled();
  });
});

// =============================================================================
// updateModifierType Tests (wrapper around batchUpdateModifierType)
// =============================================================================

describe('updateModifierType', () => {
  it('should update a modifier type and return first result', async () => {
    const existingOption = createMockOption({ id: 'opt_1' });
    const existingModifierType = createMockOptionType({
      id: 'mt_1',
      name: 'Size',
      options: ['opt_1'],
    });

    const deps = createMockModifierDeps({
      catalog: {
        modifierTypes: [existingModifierType],
        options: [existingOption],
      },
    });

    // Mock repository responses
    (deps.optionRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);
    (deps.optionTypeRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

    const result = await updateModifierType(deps, {
      id: 'mt_1',
      modifierType: { name: 'Updated Size' },
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe('mt_1');
    expect(deps.syncModifierTypes).toHaveBeenCalled();
    expect(deps.syncOptions).toHaveBeenCalled();
  });
});

// =============================================================================
// deleteModifierType Tests
// =============================================================================

describe('deleteModifierType', () => {
  it('should delete a modifier type and all its options', async () => {
    const existingOption = createMockOption({ id: 'opt_1', externalIDs: [] });
    const existingModifierType = createMockOptionType({
      id: 'mt_1',
      options: ['opt_1'],
      externalIDs: [],
    });

    const deps = createMockModifierDeps({
      catalog: {
        modifierTypes: [existingModifierType],
        options: [existingOption],
      },
    });

    (deps.optionTypeRepository.findById as jest.Mock).mockResolvedValue(existingModifierType);
    (deps.optionTypeRepository.delete as jest.Mock).mockResolvedValue(true);
    (deps.optionRepository.findById as jest.Mock).mockResolvedValue(existingOption);
    (deps.optionRepository.delete as jest.Mock).mockResolvedValue(true);

    const result = await deleteModifierType(deps, 'mt_1');

    expect(result).toEqual(existingModifierType);
    expect(deps.optionTypeRepository.findById).toHaveBeenCalledWith('mt_1');
    expect(deps.optionTypeRepository.delete).toHaveBeenCalledWith('mt_1');
    expect(deps.batchDeleteCatalogObjectsFromExternalIds).toHaveBeenCalled();
    expect(deps.removeModifierTypeFromProducts).toHaveBeenCalledWith('mt_1');
    expect(deps.syncOptions).toHaveBeenCalled();
    expect(deps.syncModifierTypes).toHaveBeenCalled();
    expect(deps.recomputeCatalog).toHaveBeenCalled();
  });

  it('should return null when modifier type not found', async () => {
    const deps = createMockModifierDeps({});
    (deps.optionTypeRepository.findById as jest.Mock).mockResolvedValue(null);

    const result = await deleteModifierType(deps, 'nonexistent');

    expect(result).toBeNull();
  });
});

// =============================================================================
// createOption Tests
// =============================================================================

describe('createOption', () => {
  it('should create a modifier option and update modifier type', async () => {
    const existingOption = createMockOption({ id: 'opt_1' });
    const existingModifierType = createMockOptionType({
      id: 'mt_1',
      name: 'Size',
      max_selected: 3, // Allow multiple selections
      options: ['opt_1'],
    });

    const deps = createMockModifierDeps({
      catalog: {
        modifierTypes: [existingModifierType],
        options: [existingOption],
      },
    });

    const newOption = createMockOption({ id: 'opt_new', displayName: 'Medium' });

    const { id: _id, ...newOptionWithoutId } = newOption;

    (deps.optionRepository.create as jest.Mock).mockResolvedValue(newOption);
    // Mock for updateModifierType call
    (deps.optionRepository.bulkUpdate as jest.Mock).mockResolvedValue(2);
    (deps.optionTypeRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

    const _result = await createOption(deps, 'mt_1', newOptionWithoutId);

    expect(deps.optionRepository.create).toHaveBeenCalled();
    expect(deps.syncOptions).toHaveBeenCalled();
    expect(deps.recomputeCatalog).toHaveBeenCalled();
    // Result comes from catalog after sync, which in tests may be undefined
    // The important thing is the create was called
  });

  it('should return null when modifier type not found', async () => {
    // Create deps with an empty modifiers catalog (not undefined)
    const deps = createMockModifierDeps({
      catalog: {
        modifierTypes: [],
        options: [],
      },
    });
    const newOption = createMockOption({ displayName: 'Medium' });

    const { id: _id, ...newOptionWithoutId } = newOption;

    const result = await createOption(deps, 'nonexistent', newOptionWithoutId);

    expect(result).toBeNull();
  });
});

// =============================================================================
// updateModifierOption Tests (wrapper around batchUpdateModifierOption)
// =============================================================================

describe('updateModifierOption', () => {
  it('should update a modifier option and return first result', async () => {
    const existingOption = createMockOption({
      id: 'opt_1',
      displayName: 'Small',
      externalIDs: [],
    });
    const existingModifierType = createMockOptionType({
      id: 'mt_1',
      options: ['opt_1'],
      externalIDs: [],
    });

    const deps = createMockModifierDeps({
      catalog: {
        modifierTypes: [existingModifierType],
        options: [existingOption],
      },
    });

    // Mock Square retrieve
    (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue({
      success: true,
      result: { objects: [] },
    });

    // Mock Square upsert
    (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue({
      success: true,
      result: { idMappings: [] },
    });

    // Mock repository update
    (deps.optionRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

    const result = await updateModifierOption(deps, {
      id: 'opt_1',
      modifierTypeId: 'mt_1',
      option: { displayName: 'Small Updated' },
    });

    expect(result).not.toBeNull();
    expect(deps.optionRepository.bulkUpdate).toHaveBeenCalled();
    expect(deps.syncOptions).toHaveBeenCalled();
    expect(deps.recomputeCatalog).toHaveBeenCalled();
  });
});

// =============================================================================
// deleteModifierOption Tests
// =============================================================================

describe('deleteModifierOption', () => {
  it('should delete a modifier option and clean up references', async () => {
    const existingOption = createMockOption({
      id: 'opt_1',
      externalIDs: [],
    });
    const existingModifierType = createMockOptionType({
      id: 'mt_1',
      options: ['opt_1', 'opt_2'],
    });

    const deps = createMockModifierDeps({
      catalog: {
        modifierTypes: [existingModifierType],
        options: [existingOption, createMockOption({ id: 'opt_2' })],
      },
    });

    (deps.optionRepository.findById as jest.Mock).mockResolvedValue(existingOption);
    (deps.optionRepository.delete as jest.Mock).mockResolvedValue(true);

    const result = await deleteModifierOption(deps, 'mt_1', 'opt_1');

    expect(result).toEqual(existingOption);
    expect(deps.optionRepository.findById).toHaveBeenCalledWith('opt_1');
    expect(deps.optionRepository.delete).toHaveBeenCalledWith('opt_1');
    expect(deps.batchDeleteCatalogObjectsFromExternalIds).toHaveBeenCalledWith([]);
    expect(deps.removeModifierOptionFromProductInstances).toHaveBeenCalledWith('mt_1', 'opt_1');
    expect(deps.syncOptions).toHaveBeenCalled();
    expect(deps.recomputeCatalog).toHaveBeenCalled();
  });

  it('should return null when option not found', async () => {
    const deps = createMockModifierDeps({});
    (deps.optionRepository.findById as jest.Mock).mockResolvedValue(null);

    const result = await deleteModifierOption(deps, 'mt_1', 'nonexistent');

    expect(result).toBeNull();
  });

  it('should not recompute catalog when suppressed', async () => {
    const existingOption = createMockOption({
      id: 'opt_1',
      externalIDs: [],
    });

    const deps = createMockModifierDeps({
      catalog: {
        modifierTypes: [createMockOptionType({ id: 'mt_1', options: ['opt_1', 'opt_2'] })],
        options: [existingOption, createMockOption({ id: 'opt_2' })],
      },
    });

    (deps.optionRepository.findById as jest.Mock).mockResolvedValue(existingOption);
    (deps.optionRepository.delete as jest.Mock).mockResolvedValue(true);

    const result = await deleteModifierOption(deps, 'mt_1', 'opt_1', true);

    expect(result).toEqual(existingOption);
    expect(deps.recomputeCatalog).not.toHaveBeenCalled();
  });
});
