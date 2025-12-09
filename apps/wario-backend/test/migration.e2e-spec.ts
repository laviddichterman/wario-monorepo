import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import mongoose from 'mongoose';
import { type DataSource } from 'typeorm';

import { type DBVersionEntity, type ProductEntity } from 'src/entities';

import { AppModule } from '../src/app.module';
import type { SettingsEntity } from '../src/entities/settings/settings.entity';

import {
  createMockProductEntity,
  createMockSettingsEntity
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

  beforeAll(async () => {
    // 1. Seed MongoDB directly before App Start
    mongoConn = await mongoose.createConnection(MONGO_URI).asPromise();

    // SAFETY: Only drop if explicitly a test database or localhost to prevent production accidents
    if (MONGO_URI.includes('test') || MONGO_URI.includes('localhost') || MONGO_URI.includes('127.0.0.1')) {
      await mongoConn.dropDatabase(); // Clean start
    } else {
      console.warn(`[WARN] Skipping dropDatabase for safety. URI: ${MONGO_URI}`);
    }

    // Seed Product
    const mockProduct = createMockProductEntity({
      price: { amount: 1000, currency: 'USD' },
    });

    const { rowId: _pRowId, ...productData } = mockProduct;
    await mongoConn.collection('products').insertOne(productData);

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
      major: 1, minor: 0, patch: 0
    });

    // 2. Start App (triggers Migration)
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init(); // This should trigger DatabaseManagerService.onModuleInit -> migrateAll

    dataSource = app.get<DataSource>(getDataSourceToken());
  });

  afterAll(async () => {
    if (app) await app.close();
    // Close seed connection
    if (mongoConn) await mongoConn.close();
  });

  it('should migrate users from Mongoose to Postgres', async () => {
    if (!dataSource) throw new Error('DataSource not initialized');

    // Check if Product was migrated

    const products: ProductEntity[] = (await dataSource.query(`SELECT * FROM products`));
    expect(products.length).toBe(1);

    // Validating price structure instead of name

    expect(products[0].price).toBeDefined();

    expect(products[0].price.amount).toBe(1000);
  });

  it('should set DBVersion correctly', async () => {
    if (!dataSource) throw new Error('DataSource not initialized');


    const version: DBVersionEntity[] = (await dataSource.query(`SELECT * FROM db_version`));
    expect(version.length).toBeGreaterThan(0);
  });
});
