import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import mongoose from 'mongoose';
import { type DataSource } from 'typeorm';

import {
  type CatalogVersionEntity,
  type DBVersionEntity,
  type OptionTypeEntity,
  type ProductEntity,
} from 'src/entities';

import { AppModule } from '../src/app.module';
import { DatabaseManagerService } from '../src/config/database-manager/database-manager.service';
import type { SettingsEntity } from '../src/entities/settings/settings.entity';

import {
  createMockOptionTypeEntity,
  createMockProductEntity,
  createMockProductInstanceEntity,
  createMockSettingsEntity,
} from './utils/mock-entities';

// Only run if explicitly requested
const RUN_MIGRATION_TEST = process.env.TEST_MIGRATION === 'true';

// Mixed Type for Legacy Settings
type LegacySettingsSeed = Partial<SettingsEntity>;

(RUN_MIGRATION_TEST ? describe : describe.skip)('Migration E2E', () => {
  let app: INestApplication | undefined;
  let dataSource: DataSource | undefined;
  let mongoConn: mongoose.Connection | undefined;

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/wario_test';

  // Test IDs for cross-reference verification
  const TEST_PRODUCT_ID = 'test-product-id';
  const TEST_PRODUCT_INSTANCE_ID = 'test-product-instance-id';
  const TEST_OPTION_TYPE_ID = 'test-option-type-id';

  beforeAll(async () => {
    // 1. Seed MongoDB directly before App Start
    mongoConn = await mongoose.createConnection(MONGO_URI).asPromise();

    // SAFETY: Only drop if explicitly a test database or localhost to prevent production accidents
    if (MONGO_URI.includes('test') || MONGO_URI.includes('localhost') || MONGO_URI.includes('127.0.0.1')) {
      await mongoConn.dropDatabase(); // Clean start
    } else {
      console.warn(`[WARN] Skipping dropDatabase for safety. URI: ${MONGO_URI}`);
    }

    // Seed ProductInstance first (Products reference it via baseProductId)
    const mockProductInstance = createMockProductInstanceEntity({
      id: TEST_PRODUCT_INSTANCE_ID,
      productId: TEST_PRODUCT_ID,
      displayName: 'Test Product Instance',
      shortcode: 'TPI',
    });

    const { rowId: _piRowId, validFrom: _piVf, validTo: _piVt, createdAt: _piCa, id: piId, ...productInstanceData } = mockProductInstance;
    await mongoConn.collection('wproductinstances').insertOne({
      _id: piId as unknown as mongoose.Types.ObjectId,
      ...productInstanceData,
    });

    // Seed Product with reference to ProductInstance
    const mockProduct = createMockProductEntity({
      id: TEST_PRODUCT_ID,
      baseProductId: TEST_PRODUCT_INSTANCE_ID,
      price: { amount: 1000, currency: 'USD' },
    });

    const { rowId: _pRowId, validFrom: _pVf, validTo: _pVt, createdAt: _pCa, id: pId, ...productData } = mockProduct;
    await mongoConn.collection('products').insertOne({
      _id: pId as unknown as mongoose.Types.ObjectId,
      ...productData,
    });

    // Seed OptionType (was previously not being migrated)
    const mockOptionType = createMockOptionTypeEntity({
      id: TEST_OPTION_TYPE_ID,
      name: 'Test Option Type',
      displayName: 'Size',
    });

    const { rowId: _otRowId, validFrom: _otVf, validTo: _otVt, createdAt: _otCa, id: otId, ...optionTypeData } = mockOptionType;
    await mongoConn.collection('optiontypes').insertOne({
      _id: otId as unknown as mongoose.Types.ObjectId,
      ...optionTypeData,
    });

    // Seed Settings
    const mockSettings = createMockSettingsEntity({
      LOCATION_NAME: 'Test Location',
    });

    const { rowId: _sRowId, ...validSettingsData } = mockSettings;

    // Simulate legacy MongoDB data safely
    const settingsSeed: LegacySettingsSeed = {
      ...validSettingsData,
    };

    await mongoConn.collection('settings').insertOne(settingsSeed);

    // Seed DBVersion (Legacy) -> 1.0.0
    await mongoConn.collection('dbversions').insertOne({
      major: 1, minor: 0, patch: 0,
    });

    // 2. Start App (triggers Migration)
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init(); // This triggers DatabaseManagerService.onModuleInit -> migrateAll

    // CRITICAL: Wait for database initialization (migration) to complete
    const dbManager = app.get(DatabaseManagerService);
    await dbManager.ensureInitialized();

    dataSource = app.get<DataSource>(getDataSourceToken());
  });

  afterAll(async () => {
    if (app) await app.close();
    // Close seed connection
    if (mongoConn) await mongoConn.close();
  });

  it('should migrate products from Mongoose to Postgres', async () => {
    if (!dataSource) throw new Error('DataSource not initialized');

    // Check if Product was migrated
    const products: ProductEntity[] = (await dataSource.query(`SELECT * FROM products WHERE id = $1`, [TEST_PRODUCT_ID]));
    expect(products.length).toBe(1);

    // Validating price structure
    expect(products[0].price).toBeDefined();
    expect(products[0].price.amount).toBe(1000);
  });

  it('should migrate products with valid baseProductId', async () => {
    if (!dataSource) throw new Error('DataSource not initialized');

    const products: ProductEntity[] = (await dataSource.query(`SELECT * FROM products WHERE id = $1`, [TEST_PRODUCT_ID]));
    expect(products.length).toBe(1);

    // CRITICAL: baseProductId should be set from MongoDB document
    expect(products[0].baseProductId).toBe(TEST_PRODUCT_INSTANCE_ID);
  });

  it('should migrate OptionTypes from Mongoose to Postgres', async () => {
    if (!dataSource) throw new Error('DataSource not initialized');

    // This was previously not being migrated (migrateOptionTypes was never called)
    const optionTypes: OptionTypeEntity[] = (await dataSource.query(`SELECT * FROM option_types WHERE id = $1`, [TEST_OPTION_TYPE_ID]));
    expect(optionTypes.length).toBe(1);
    expect(optionTypes[0].name).toBe('Test Option Type');
  });

  it('should create CatalogVersion for migrated data', async () => {
    if (!dataSource) throw new Error('DataSource not initialized');

    // A CatalogVersion should be created during migration for order references
    const catalogVersions: CatalogVersionEntity[] = (await dataSource.query(
      `SELECT * FROM catalog_versions WHERE description LIKE '%migration%'`
    ));
    expect(catalogVersions.length).toBeGreaterThan(0);
  });

  it('should set DBVersion correctly', async () => {
    if (!dataSource) throw new Error('DataSource not initialized');

    const version: DBVersionEntity[] = (await dataSource.query(`SELECT * FROM db_version`));
    expect(version.length).toBeGreaterThan(0);
  });
});
