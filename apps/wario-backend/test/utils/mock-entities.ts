/* eslint-disable @typescript-eslint/no-misused-spread */


 
 

import {
  createMockCategory,
  createMockOption,
  createMockOptionType,
  createMockOrderInstanceFunction,
  createMockProduct,
  createMockProductInstance,
  createMockProductInstanceFunction,
} from '@wcp/wario-shared/testing';

import type { TemporalEntity } from '../../src/entities/base/temporal.entity';
import type { CatalogVersionEntity } from '../../src/entities/catalog/catalog-version.entity';
import type { CategoryEntity } from '../../src/entities/catalog/category.entity';
import type { OptionTypeEntity } from '../../src/entities/catalog/option-type.entity';
import type { OptionEntity } from '../../src/entities/catalog/option.entity';
import type { OrderInstanceFunctionEntity } from '../../src/entities/catalog/order-instance-function.entity';
import type { ProductInstanceFunctionEntity } from '../../src/entities/catalog/product-instance-function.entity';
import type { ProductInstanceEntity } from '../../src/entities/catalog/product-instance.entity';
import type { ProductEntity } from '../../src/entities/catalog/product.entity';
import type { OrderEntity } from '../../src/entities/order/order.entity';
import type { DBVersionEntity } from '../../src/entities/settings/db-version.entity';
import type { FulfillmentEntity } from '../../src/entities/settings/fulfillment.entity';
import type { KeyValueEntity } from '../../src/entities/settings/key-value.entity';
import type { PrinterGroupEntity } from '../../src/entities/settings/printer-group.entity';
import type { SeatingResourceEntity } from '../../src/entities/settings/seating-resource.entity';
import type { SettingsEntity } from '../../src/entities/settings/settings.entity';

import { createMockWOrderInstance } from './order-mocks';

// ============================================================================
// Temporal Entity Helper
// ============================================================================

export const mockTemporalEntity = <T extends TemporalEntity>(overrides: Partial<TemporalEntity> = {}): Partial<T> => ({
  rowId: 'row-uuid',
  id: 'temporal-id',
  validFrom: new Date('2023-01-01T00:00:00Z'),
  validTo: null,
  createdAt: new Date('2023-01-01T00:00:00Z'),
  ...overrides,
} as unknown as Partial<T>);

// ============================================================================
// Catalog Entities
// ============================================================================

export const createMockProductEntity = (overrides: Partial<ProductEntity> = {}): ProductEntity => {
  const base = createMockProduct(overrides);
  const temporal = mockTemporalEntity<ProductEntity>(overrides);

  return {
    ...base,
    ...temporal,
    baseProductId: overrides.baseProductId ?? 'pi1',
    printerGroup: overrides.printerGroup ?? null,
    category_ids: overrides.category_ids ?? [],
    ...overrides,
  } as unknown as ProductEntity;
};

export const createMockProductInstanceEntity = (overrides: Partial<ProductInstanceEntity> = {}): ProductInstanceEntity => {
  const base = createMockProductInstance(overrides);
  const temporal = mockTemporalEntity<ProductInstanceEntity>(overrides);
  return {
    ...base,
    ...temporal,
    ...overrides,
  } as unknown as ProductInstanceEntity;
};

export const createMockCategoryEntity = (overrides: Partial<CategoryEntity> = {}): CategoryEntity => {
  const base = createMockCategory(overrides);
  const temporal = mockTemporalEntity<CategoryEntity>(overrides);
  return {
    ...base,
    ...temporal,
    ...overrides,
  } as unknown as CategoryEntity;
};

export const createMockOptionTypeEntity = (overrides: Partial<OptionTypeEntity> = {}): OptionTypeEntity => {
  const base = createMockOptionType(overrides);
  const temporal = mockTemporalEntity<OptionTypeEntity>(overrides);
  return {
    ...base,
    ...temporal,
    ...overrides,
  } as unknown as OptionTypeEntity;
};

export const createMockOptionEntity = (overrides: Partial<OptionEntity> = {}): OptionEntity => {
  const base = createMockOption(overrides);
  const temporal = mockTemporalEntity<OptionEntity>(overrides);
  return {
    ...base,
    ...temporal,
    ...overrides,
  } as unknown as OptionEntity;
};

export const createMockOrderInstanceFunctionEntity = (overrides: Partial<OrderInstanceFunctionEntity> = {}): OrderInstanceFunctionEntity => {
  const base = createMockOrderInstanceFunction(overrides);
  const temporal = mockTemporalEntity<OrderInstanceFunctionEntity>(overrides);
  return {
    ...base,
    ...temporal,
    ...overrides,
  } as unknown as OrderInstanceFunctionEntity;
};

export const createMockProductInstanceFunctionEntity = (overrides: Partial<ProductInstanceFunctionEntity> = {}): ProductInstanceFunctionEntity => {
  const base = createMockProductInstanceFunction(overrides);
  const temporal = mockTemporalEntity<ProductInstanceFunctionEntity>(overrides);
  return {
    ...base,
    ...temporal,
    ...overrides,
  } as unknown as ProductInstanceFunctionEntity;
};

export const createMockCatalogVersionEntity = (overrides: Partial<CatalogVersionEntity> = {}): CatalogVersionEntity => {
  const defaults: CatalogVersionEntity = {
    id: 'cv-uuid',
    version: { major: 1, minor: 0, patch: 0 },
    publishedAt: new Date(),
    hash: 'hash',
  } as unknown as CatalogVersionEntity;


  return { ...defaults, ...overrides } as unknown as CatalogVersionEntity;
};

// ============================================================================
// Order Entity
// ============================================================================

export const createMockOrderEntity = (overrides: Partial<OrderEntity> = {}): OrderEntity => {
  const base = createMockWOrderInstance(overrides);
  return {
    ...base,
    catalogVersionId: 'cv1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as OrderEntity;
};

// ============================================================================
// Settings Entities
// ============================================================================

export const createMockSettingsEntity = (overrides: Partial<SettingsEntity> = {}): SettingsEntity => {
  const defaults = {
    rowId: 'settings-uuid',
    config: { someKey: 'someValue' },
    LOCATION_NAME: 'Wario Pizza',
    SQUARE_LOCATION: 'sq_loc_1',
    SQUARE_LOCATION_ALTERNATE: 'sq_loc_2',
    SQUARE_APPLICATION_ID: 'sq_app_1',
    DEFAULT_FULFILLMENTID: 'ful1',
    TAX_RATE: 0.08,
    ALLOW_ADVANCED: false,
    TIP_PREAMBLE: 'Tip your driver!',
    LOCATION_PHONE_NUMBER: '555-0123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    ...defaults,
    ...overrides,
  } as unknown as SettingsEntity;
};

export const createMockPrinterGroupEntity = (overrides: Partial<PrinterGroupEntity> = {}): PrinterGroupEntity => {
  const defaults = {
    id: 'pg1',
    name: 'Kitchen Printers',
    description: 'All kitchen printers',
    printer_ids: ['p1', 'p2'],
  };
  return {
    ...defaults,
    ...overrides,
  } as unknown as PrinterGroupEntity;
};

export const createMockFulfillmentEntity = (overrides: Partial<FulfillmentEntity> = {}): FulfillmentEntity => {
  const defaults = {
    id: 'ful1',
    name: 'Delivery',
    config: { prepTime: 30 },
  };
  return {
    ...defaults,
    ...overrides,
  } as unknown as FulfillmentEntity;
};

export const createMockDbVersionEntity = (overrides: Partial<DBVersionEntity> = {}): DBVersionEntity => {
  const defaults = {
    rowId: 'DB_VERSION_UUID',
    major: 1,
    minor: 0,
    patch: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    ...defaults,
    ...overrides,
  } as unknown as DBVersionEntity;
};

export const createMockSeatingResourceEntity = (overrides: Partial<SeatingResourceEntity> = {}): SeatingResourceEntity => {
  const defaults = {
    id: 'sr1',
    name: 'Table 1',
    sectionId: 'sec1',
    capacity: 4,
  };
  return {
    ...defaults,
    ...overrides,
  } as unknown as SeatingResourceEntity;
};

export const createMockKeyValueEntity = (overrides: Partial<KeyValueEntity> = {}): KeyValueEntity => {
  const defaults = {
    key: 'someKey',
    value: 'someValue',
  };
  return {
    ...defaults,
    ...overrides,
  } as unknown as KeyValueEntity;
};
