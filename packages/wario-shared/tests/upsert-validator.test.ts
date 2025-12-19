import { IsNotEmpty, IsString, validateSync } from 'class-validator';

import { IsUpsertArray } from '../src/lib/dto/api.dto';

// --- Test DTOs ---

class TestCreateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

class TestUpdateDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

class TestParentDto {
  @IsUpsertArray(TestCreateDto, TestUpdateDto)
  items!: (TestCreateDto | TestUpdateDto)[];
}

// --- Tests ---

describe('IsUpsertArray Validator', () => {
  it('should validate valid Create items (no id)', () => {
    const parent = new TestParentDto();
    parent.items = [{ name: 'Create Item' }];

    const errors = validateSync(parent);
    expect(errors).toHaveLength(0);
  });

  it('should validate valid Update items (with id)', () => {
    const parent = new TestParentDto();
    parent.items = [{ id: '123', name: 'Update Item' }];

    const errors = validateSync(parent);
    expect(errors).toHaveLength(0);
  });

  it('should validate mixed Create and Update items', () => {
    const parent = new TestParentDto();
    parent.items = [{ name: 'Create Item' }, { id: '123', name: 'Update Item' }];

    const errors = validateSync(parent);
    expect(errors).toHaveLength(0);
  });

  it('should fail if Create item is invalid (missing name)', () => {
    const parent = new TestParentDto();
    parent.items = [{ name: '' }]; // invalid

    const errors = validateSync(parent);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('IsUpsertArrayConstraint');
  });

  it('should fail if Update item is invalid (missing name)', () => {
    const parent = new TestParentDto();
    parent.items = [{ id: '123', name: '' }]; // invalid

    const errors = validateSync(parent);
    expect(errors).toHaveLength(1);
  });

  it('should fail if Update item is missing ID but matches Create structure', () => {
    // If we pass something that looks like an update but has no ID, it is treated as a Create item.
    // Since it matches Create structure, it passes as a Create item.

    const parent = new TestParentDto();
    // Treated as Create item because no ID. 'extra' is ignored.
    // @ts-expect-error Testing weird input
    parent.items = [{ name: 'Valid Create', extra: 'Bar' }];
    const errors = validateSync(parent);
    expect(errors).toHaveLength(0);
  });

  it('should fail if item is not an object', () => {
    const parent = new TestParentDto();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    parent.items = ['not an object' as any];

    const errors = validateSync(parent);
    expect(errors).toHaveLength(1);
  });

  it('should fail if items is not an array', () => {
    const parent = new TestParentDto();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    parent.items = 'not an array' as any;

    const errors = validateSync(parent);
    expect(errors).toHaveLength(1);
  });

  it('should check error message format', () => {
    const parent = new TestParentDto();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    parent.items = 'fail' as any;
    const errors = validateSync(parent);
    expect(errors[0].constraints?.IsUpsertArrayConstraint).toContain(
      'valid TestCreateDto (no id) or TestUpdateDto (with id)',
    );
  });
});
