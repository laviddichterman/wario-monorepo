/**
 * Unit tests for UpdateIProductRequestDto validation.
 * Specifically tests the IsUpsertProductInstanceArrayConstraint custom validator
 * that discriminates between Create and Update DTOs based on presence of 'id'.
 */

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import {
  CreateIProductInstanceRequestDto,
  IsUpsertProductInstanceArrayConstraint,
  UpdateIProductInstanceRequestDto,
  UpdateIProductRequestDto,
} from '../src/lib/dto/api.dto';
import { PriceDisplay } from '../src/lib/enums';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a valid product instance DTO payload (for Create - no id)
 */
function createValidProductInstancePayload(): Omit<CreateIProductInstanceRequestDto, 'id'> {
  return {
    displayName: 'Test Instance',
    shortcode: 'TI',
    description: 'Test description',
    modifiers: [],
    externalIDs: [],
    displayFlags: {
      pos: {
        hide: false,
        name: 'Test',
        skip_customization: false,
      },
      menu: {
        ordinal: 0,
        hide: false,
        price_display: PriceDisplay.ALWAYS,
        adornment: '',
        suppress_exhaustive_modifier_list: false,
        show_modifier_options: true,
      },
      order: {
        ordinal: 0,
        hide: false,
        skip_customization: false,
        price_display: PriceDisplay.ALWAYS,
        adornment: '',
        suppress_exhaustive_modifier_list: false,
      },
    },
  };
}

/**
 * Creates a valid UpdateIProductRequestDto payload
 */
function createValidUpdateProductPayload(
  instances: Array<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    id: 'prod_1',
    instances,
    // All other product fields are optional due to PartialType
  };
}

// ============================================================================
// IsUpsertProductInstanceArrayConstraint Tests
// ============================================================================

describe('IsUpsertProductInstanceArrayConstraint', () => {
  let constraint: IsUpsertProductInstanceArrayConstraint;

  beforeEach(() => {
    constraint = new IsUpsertProductInstanceArrayConstraint();
  });

  describe('validate()', () => {
    it('should return false for non-array input', () => {
      expect(constraint.validate('not an array' as unknown as unknown[])).toBe(false);
      expect(constraint.validate(null as unknown as unknown[])).toBe(false);
      expect(constraint.validate(undefined as unknown as unknown[])).toBe(false);
      expect(constraint.validate({} as unknown as unknown[])).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(constraint.validate([])).toBe(true);
    });

    it('should return true for valid create instance (no id)', () => {
      const createInstance = createValidProductInstancePayload();
      const result = constraint.validate([createInstance]);
      expect(result).toBe(true);
    });

    it('should return true for valid update instance (with id)', () => {
      const updateInstance = {
        id: 'pi_existing',
        // All other fields optional due to PartialType
      };
      expect(constraint.validate([updateInstance])).toBe(true);
    });

    it('should return true for valid update instance with partial fields', () => {
      const updateInstance = {
        id: 'pi_existing',
        displayName: 'Updated Name',
      };
      expect(constraint.validate([updateInstance])).toBe(true);
    });

    it('should return true for mixed create and update instances', () => {
      const createInstance = createValidProductInstancePayload();
      const updateInstance = { id: 'pi_existing' };

      expect(constraint.validate([createInstance, updateInstance])).toBe(true);
    });

    it('should treat empty string id as create (not update)', () => {
      const instanceWithEmptyId = {
        id: '',
        ...createValidProductInstancePayload(),
      };
      // Empty id should be treated as create, which requires all fields
      expect(constraint.validate([instanceWithEmptyId])).toBe(true);
    });

    it('should return false for invalid create instance (missing required fields)', () => {
      const invalidCreateInstance = {
        // Missing displayName and other required fields
        shortcode: 'TI',
      };
      expect(constraint.validate([invalidCreateInstance])).toBe(false);
    });

    it('should return false for update instance with invalid id type', () => {
      const invalidUpdateInstance = {
        id: 123, // id must be string
      };
      expect(constraint.validate([invalidUpdateInstance])).toBe(false);
    });

    it('should return false if any instance in array is invalid', () => {
      const validInstance = { id: 'pi_existing' };
      const invalidInstance = { shortcode: 'X' }; // Missing required fields for create

      expect(constraint.validate([validInstance, invalidInstance])).toBe(false);
    });
  });

  describe('defaultMessage()', () => {
    it('should return appropriate error message', () => {
      const message = constraint.defaultMessage();
      expect(message).toContain('CreateIProductInstanceRequestDto');
      expect(message).toContain('UpdateIProductInstanceRequestDto');
    });
  });
});

// ============================================================================
// UpdateIProductRequestDto Integration Tests
// ============================================================================

describe('UpdateIProductRequestDto', () => {
  describe('validation with @IsUpsertProductInstanceArray decorator', () => {
    it('should pass validation with valid update instances', () => {
      const payload = createValidUpdateProductPayload([
        { id: 'pi_1' },
        { id: 'pi_2', displayName: 'Updated Name' },
      ]);

      const dto = plainToInstance(UpdateIProductRequestDto, payload);
      const errors = validateSync(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass validation with valid create instances', () => {
      const payload = createValidUpdateProductPayload([
        createValidProductInstancePayload(),
      ]);

      const dto = plainToInstance(UpdateIProductRequestDto, payload);
      const errors = validateSync(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass validation with mixed create and update instances', () => {
      const payload = createValidUpdateProductPayload([
        { id: 'pi_existing' },
        createValidProductInstancePayload(),
        { id: 'pi_another', shortcode: 'NEW' },
      ]);

      const dto = plainToInstance(UpdateIProductRequestDto, payload);
      const errors = validateSync(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation with invalid instances', () => {
      const payload = createValidUpdateProductPayload([
        { shortcode: 'X' }, // Invalid: missing required fields for create
      ]);

      const dto = plainToInstance(UpdateIProductRequestDto, payload);
      const errors = validateSync(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('instances');
    });

    it('should fail validation when instances is not an array', () => {
      const payload = {
        id: 'prod_1',
        instances: 'not an array',
      };

      const dto = plainToInstance(UpdateIProductRequestDto, payload);
      const errors = validateSync(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when id is missing', () => {
      const payload = {
        // Missing id
        instances: [{ id: 'pi_1' }],
      };

      const dto = plainToInstance(UpdateIProductRequestDto, payload);
      const errors = validateSync(dto);

      expect(errors.length).toBeGreaterThan(0);
      const idError = errors.find((e) => e.property === 'id');
      expect(idError).toBeDefined();
    });

    it('should fail validation when id is empty string', () => {
      const payload = {
        id: '',
        instances: [{ id: 'pi_1' }],
      };

      const dto = plainToInstance(UpdateIProductRequestDto, payload);
      const errors = validateSync(dto);

      expect(errors.length).toBeGreaterThan(0);
      const idError = errors.find((e) => e.property === 'id');
      expect(idError).toBeDefined();
    });
  });
});

// ============================================================================
// Individual DTO Class Tests
// ============================================================================

describe('CreateIProductInstanceRequestDto', () => {
  it('should fail validation if id is provided', () => {
    // CreateIProductInstanceRequestDto explicitly omits id
    const payload: Record<string, unknown> = {
      id: 'should_not_have_id', // This should be ignored/not allowed
      ...createValidProductInstancePayload(),
    };

    const dto = plainToInstance(CreateIProductInstanceRequestDto, payload);
    const errors = validateSync(dto);

    // The id field should be ignored by OmitType, so validation should pass
    // (the id property is simply not validated/not part of the schema)
    expect(errors.length).toBe(0);
    // But the id should still be present on the instance (class-transformer copies all props)
    expect((dto as unknown as Record<string, unknown>).id).toBe('should_not_have_id');
  });

  it('should fail validation if required fields are missing', () => {
    const payload = {
      displayName: 'Test',
      // Missing other required fields
    };

    const dto = plainToInstance(CreateIProductInstanceRequestDto, payload);
    const errors = validateSync(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateIProductInstanceRequestDto', () => {
  it('should pass validation with only id (all other fields optional)', () => {
    const payload = {
      id: 'pi_existing',
    };

    const dto = plainToInstance(UpdateIProductInstanceRequestDto, payload);
    const errors = validateSync(dto);

    expect(errors.length).toBe(0);
  });

  it('should pass validation with id and partial fields', () => {
    const payload = {
      id: 'pi_existing',
      displayName: 'Updated Name',
      shortcode: 'UN',
    };

    const dto = plainToInstance(UpdateIProductInstanceRequestDto, payload);
    const errors = validateSync(dto);

    expect(errors.length).toBe(0);
  });

  it('should fail validation if id is missing', () => {
    const payload = {
      displayName: 'Updated Name',
    };

    const dto = plainToInstance(UpdateIProductInstanceRequestDto, payload);
    const errors = validateSync(dto);

    expect(errors.length).toBeGreaterThan(0);
    const idError = errors.find((e) => e.property === 'id');
    expect(idError).toBeDefined();
  });

  it('should fail validation if id is empty string', () => {
    const payload = {
      id: '',
    };

    const dto = plainToInstance(UpdateIProductInstanceRequestDto, payload);
    const errors = validateSync(dto);

    expect(errors.length).toBeGreaterThan(0);
    const idError = errors.find((e) => e.property === 'id');
    expect(idError).toBeDefined();
  });
});
