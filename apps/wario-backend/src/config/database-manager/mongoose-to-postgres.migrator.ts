/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-template-expressions */

import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource, EntityManager } from 'typeorm';

import {
  CategoryEntity,
  DBVersionEntity,
  FulfillmentEntity, // Fixed name
  KeyValueEntity,
  OptionEntity,
  OptionTypeEntity,
  OrderEntity,
  PrinterGroupEntity,
  ProductEntity,
  ProductInstanceEntity,
  ProductInstanceFunctionEntity,
  SeatingResourceEntity,
  SettingsEntity,
} from '../../entities';

@Injectable()
export class MongooseToPostgresMigrator {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly dataSource: DataSource,
    @InjectPinoLogger(MongooseToPostgresMigrator.name)
    private readonly logger: PinoLogger,
  ) { }

  async migrateAll(): Promise<void> {
    this.logger.info('Starting Mongoose to Postgres Migration...');
    const start = Date.now();

    await this.dataSource.transaction(async (manager) => {
      // 1. Independent Entities
      await this.migrateSettings(manager);
      await this.migrateKeyValue(manager);
      await this.migrateDBVersion(manager);
      await this.migratePrinterGroups(manager);
      await this.migrateSeatingResources(manager);
      await this.migrateFulfillments(manager);

      // 2. Catalog (Dependencies: PrinterGroup)
      // Order matters for references if we had foreign keys, but we largely use logical IDs.
      // However, we should do them in order of hierarchy for sanity.
      await this.migrateCategories(manager);
      await this.migrateOptions(manager);
      await this.migrateProductInstanceFunctions(manager);
      await this.migrateProductInstances(manager);
      await this.migrateProducts(manager);

      // 3. Orders (Dependencies: Everything)
      await this.migrateOrders(manager);
    });

    const duration = (Date.now() - start) / 1000;
    this.logger.info(`Migration completed in ${duration}s.`);
  }

  private async migrateSettings(manager: EntityManager) {
    this.logger.info('Migrating Settings...');
    const collection = this.mongoConnection.collection('settings');
    const doc = await collection.findOne({});

    if (doc) {

      const { _id, __v, ...data } = doc;
      // We only ever have one settings row in PG (rowId will be generated)
      const entity = manager.create(SettingsEntity, {
        ...data,
        config: data.config || {},
      });
      await manager.save(SettingsEntity, entity);
      this.logger.info('Migrated Settings.');
    } else {
      this.logger.warn('No Settings found in MongoDB.');
    }
  }

  private async migrateKeyValue(manager: EntityManager) {
    this.logger.info('Migrating KeyValue configs...');
    const collection = this.mongoConnection.collection('keyvalues');
    const docs = await collection.find({}).toArray();

    if (docs.length > 0) {
      const entities = docs.map(doc => {
        return manager.create(KeyValueEntity, {
          key: doc.key,
          value: doc.value,
        });
      });
      await manager.save(KeyValueEntity, entities);
      this.logger.info(`Migrated ${docs.length} KeyValue entries.`);
    }
  }

  private async migrateDBVersion(manager: EntityManager) {
    this.logger.info('Migrating DBVersion...');
    const collection = this.mongoConnection.collection('dbversions');
    const doc = await collection.findOne({});

    if (doc) {
      const entity = manager.create(DBVersionEntity, {
        major: doc.major,
        minor: doc.minor,
        patch: doc.patch,
      });
      await manager.save(DBVersionEntity, entity);
      this.logger.info(`Migrated DBVersion: ${doc.major}.${doc.minor}.${doc.patch}`);
    }
  }

  private async migratePrinterGroups(manager: EntityManager) {
    this.logger.info('Migrating PrinterGroups...');
    const collection = this.mongoConnection.collection('printergroups');
    const docs = await collection.find({}).toArray();

    if (docs.length > 0) {
      const entities = docs.map(doc => {
        return manager.create(PrinterGroupEntity, {
          id: doc._id.toString(),
          name: doc.name,
          isExpo: doc.isExpo,
          singleItemPerTicket: doc.singleItemPerTicket,
          summaryReceipt: doc.summaryReceipt,
          externalIDs: doc.externalIDs,
          // Temporal fields
          rowId: randomUUID(),
          validFrom: new Date(0), // Beginning of time
          validTo: null, // Current
        });
      });
      await manager.save(PrinterGroupEntity, entities);
      this.logger.info(`Migrated ${docs.length} PrinterGroups.`);
    }
  }

  private async migrateSeatingResources(manager: EntityManager) {
    this.logger.info('Migrating SeatingResources...');
    const collection = this.mongoConnection.collection('seatingresources');
    const docs = await collection.find({}).toArray();

    if (docs.length > 0) {
      const entities = docs.map(doc => {
        return manager.create(SeatingResourceEntity, {
          id: doc._id.toString(),
          name: doc.name,
          sectionId: doc.sectionId,
          x: doc.x,
          y: doc.y,
          tags: doc.tags,
          // Temporal fields
          rowId: randomUUID(),
          validFrom: new Date(0),
          validTo: null,
        });
      });
      await manager.save(SeatingResourceEntity, entities);
      this.logger.info(`Migrated ${docs.length} SeatingResources.`);
    }
  }

  private async migrateFulfillments(manager: EntityManager) {
    this.logger.info('Migrating Fulfillments...');
    const collection = this.mongoConnection.collection('fulfillments');
    const docs = await collection.find({}).toArray();

    if (docs.length > 0) {
      const entities = docs.map(doc => {
        // Mapping Mongoose fields to FulfillmentEntity
        // Assuming Mongoose schema was roughly similar to the interface
        return manager.create(FulfillmentEntity, {
          id: doc._id.toString(),
          displayName: doc.displayName || doc.name, // Fallback if name changed
          shortcode: doc.shortcode || 'DEF',
          service: doc.service || 'PICKUP',
          leadTime: doc.leadTime || 0,
          operatingHours: doc.operatingHours || {},
          // Temporal fields
          rowId: randomUUID(),
          validFrom: new Date(0),
          validTo: null,
          // Required fields with defaults if missing
          exposeFulfillment: doc.exposeFulfillment ?? true,
          ordinal: doc.ordinal ?? 0,
          allowPrepayment: doc.allowPrepayment ?? false,
          requirePrepayment: doc.requirePrepayment ?? false,
          allowTipping: doc.allowTipping ?? false,
          menuBaseCategoryId: doc.menuBaseCategoryId || 'missing',
          orderBaseCategoryId: doc.orderBaseCategoryId || 'missing',
          orderSupplementaryCategoryId: doc.orderSupplementaryCategoryId,
          messages: doc.messages || {},
          terms: doc.terms || [],
          autograt: doc.autograt,
          serviceCharge: doc.serviceCharge,
          leadTimeOffset: doc.leadTimeOffset || 0,
          specialHours: doc.specialHours || [],
          blockedOff: doc.blockedOff || [],
          minDuration: doc.minDuration || 0,
          maxDuration: doc.maxDuration || 0,
          timeStep: doc.timeStep || 15,
          maxGuests: doc.maxGuests,
          serviceArea: doc.serviceArea,
        });
      });
      await manager.save(FulfillmentEntity, entities);
      this.logger.info(`Migrated ${docs.length} Fulfillments.`);
    }
  }

  private async migrateCategories(manager: EntityManager) {
    this.logger.info('Migrating Categories...');
    const collection = this.mongoConnection.collection('categories');
    const docs = await collection.find({}).toArray();

    if (docs.length > 0) {
      const entities = docs.map(doc => {
        return manager.create(CategoryEntity, {
          id: doc._id.toString(),
          displayName: doc.displayName,
          description: doc.description,
          items: doc.items, // Array of refs
          subcategories: doc.subcategories,
          // Temporal
          rowId: randomUUID(),
          validFrom: new Date(0),
          validTo: null,
        });
      });
      await manager.save(CategoryEntity, entities);
      this.logger.info(`Migrated ${docs.length} Categories.`);
    }
  }

  private async migrateOptionTypes(manager: EntityManager) {
    this.logger.info('Migrating OptionTypes...');
    const collection = this.mongoConnection.collection('optiontypes');
    const docs = await collection.find({}).toArray();

    if (docs.length > 0) {
      const entities = docs.map(doc => {
        return manager.create(OptionTypeEntity, {
          id: doc._id.toString(),
          name: doc.name,
          displayName: doc.displayName,
          options: doc.options, // Array of strings (Logic ID refs)
          min: doc.min,
          max: doc.max,
          // Temporal
          rowId: randomUUID(),
          validFrom: new Date(0),
          validTo: null,
        });
      });
      await manager.save(OptionTypeEntity, entities);
      this.logger.info(`Migrated ${docs.length} OptionTypes.`);
    }
  }

  private async migrateOptions(manager: EntityManager) {
    this.logger.info('Migrating Options...');
    const collection = this.mongoConnection.collection('options');
    const docs = await collection.find({}).toArray();

    if (docs.length > 0) {
      const entities = docs.map(doc => {
        return manager.create(OptionEntity, {
          id: doc._id.toString(),
          name: doc.name,
          displayName: doc.displayName,
          price: doc.price,
          tags: doc.tags,
          operationMaps: doc.operationMaps,
          // Temporal
          rowId: randomUUID(),
          validFrom: new Date(0),
          validTo: null,
        });
      });
      await manager.save(OptionEntity, entities);
      this.logger.info(`Migrated ${docs.length} Options.`);
    }
  }

  private async migrateProducts(manager: EntityManager) {
    this.logger.info('Migrating Products...');
    const collection = this.mongoConnection.collection('products');
    const cursor = collection.find();

    let batch: ProductEntity[] = [];
    const BATCH_SIZE = 1000;
    let count = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      const entity = manager.create(ProductEntity, {
        id: doc._id.toString(),
        price: doc.price,
        category_ids: doc.category_ids,
        tags: doc.tags,
        printerGroup: doc.printerGroup || null,
        modifiers: doc.modifiers,
        taxRate: doc.taxRate,
        // Temporal
        rowId: randomUUID(),
        validFrom: new Date(0),
        validTo: null,
      });

      batch.push(entity);

      if (batch.length >= BATCH_SIZE) {
        await manager.save(ProductEntity, batch);
        count += batch.length;
        this.logger.info(`Migrated ${count} Products (Batch)...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await manager.save(ProductEntity, batch);
      count += batch.length;
    }
    this.logger.info(`Migrated total ${count} Products.`);
  }

  private async migrateOrders(manager: EntityManager) {
    this.logger.info('Migrating Orders...');
    const collection = this.mongoConnection.collection('orders');
    // Cursor to avoid loading all at once
    const cursor = collection.find();

    let batch: OrderEntity[] = [];
    const BATCH_SIZE = 1000;
    let count = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      // Be very careful with ID mapping
      const id = doc._id.toString();

      // Map fields to match OrderEntity
      const entity = manager.create(OrderEntity, {
        id: id,
        shortId: doc.shortId,
        status: doc.status,
        items: doc.items, // JSONB
        fulfillment: doc.fulfillment, // JSONB
        payment: doc.payment, // JSONB
        total: doc.total,
        subtotal: doc.subtotal,
        tip: doc.tip,
        tax: doc.tax,
        customer: doc.customer, // JSONB
        locked: doc.locked,
        thirdPartyInfo: doc.thirdPartyInfo, // JSONB
        // Timestamps must be preserved
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
      });

      batch.push(entity);

      if (batch.length >= BATCH_SIZE) {
        await manager.save(OrderEntity, batch);
        count += batch.length;
        this.logger.info(`Migrated ${count} Orders (Batch)...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await manager.save(OrderEntity, batch);
      count += batch.length;
    }
    this.logger.info(`Migrated total ${count} Orders.`);
  }

  private async migrateProductInstanceFunctions(manager: EntityManager) {
    this.logger.info('Migrating ProductInstanceFunctions...');
    // Collection name derived from WProductInstanceFunction.ts model registration
    const collection = this.mongoConnection.collection('wproductinstancefunctions');
    const cursor = collection.find();

    let batch: ProductInstanceFunctionEntity[] = [];
    const BATCH_SIZE = 1000;
    let count = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      const entity = manager.create(ProductInstanceFunctionEntity, {
        id: doc._id.toString(),
        name: doc.name,
        expression: doc.expression,
        // Temporal
        rowId: randomUUID(),
        validFrom: new Date(0),
        validTo: null,
      });

      batch.push(entity);

      if (batch.length >= BATCH_SIZE) {
        await manager.save(ProductInstanceFunctionEntity, batch);
        count += batch.length;
        this.logger.info(`Migrated ${count} ProductInstanceFunctions (Batch)...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await manager.save(ProductInstanceFunctionEntity, batch);
      count += batch.length;
    }
    this.logger.info(`Migrated total ${count} ProductInstanceFunctions.`);
  }

  private async migrateProductInstances(manager: EntityManager) {
    this.logger.info('Migrating ProductInstances...');
    // Collection name derived from WProductInstanceSchema.ts model registration
    // Mongoose pluralizes "WProductInstanceSchema" -> "wproductinstanceschemas"
    // Checking both likely candidates to be safe, or defaulting to schema naming convention
    let collection = this.mongoConnection.collection('wproductinstanceschemas');

    // Check availability cheaply
    if ((await collection.countDocuments()) === 0) {
      // Fallback: maybe they named it sanely?
      collection = this.mongoConnection.collection('wproductinstances');
    }

    const cursor = collection.find();
    let batch: ProductInstanceEntity[] = [];
    const BATCH_SIZE = 1000;
    let count = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      const entity = manager.create(ProductInstanceEntity, {
        id: doc._id.toString(),
        productId: doc.productId, // Reference to Product ID (Mongo)
        ordinal: doc.ordinal,
        modifiers: doc.modifiers,
        displayName: doc.displayName,
        description: doc.description,
        shortcode: doc.shortcode,
        externalIDs: doc.externalIDs,
        displayFlags: doc.displayFlags,
        // Temporal
        rowId: randomUUID(),
        validFrom: new Date(0),
        validTo: null,
      });

      batch.push(entity);

      if (batch.length >= BATCH_SIZE) {
        await manager.save(ProductInstanceEntity, batch);
        count += batch.length;
        this.logger.info(`Migrated ${count} ProductInstances (Batch)...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await manager.save(ProductInstanceEntity, batch);
      count += batch.length;
    }
    this.logger.info(`Migrated total ${count} ProductInstances.`);
  }
}
