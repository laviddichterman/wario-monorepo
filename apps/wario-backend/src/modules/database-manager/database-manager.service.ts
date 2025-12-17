import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource, EntityManager } from 'typeorm';

import { SEMVER } from '@wcp/wario-shared';

import PACKAGE_JSON from '../../../package.json';
import { AppConfigService } from 'src/config/app-config.service';
import { DBVersionEntity, SettingsEntity } from 'src/entities';
import { DB_VERSION_REPOSITORY } from '../../repositories/interfaces/db-version.repository.interface';
import type { IDBVersionRepository } from '../../repositories/interfaces/db-version.repository.interface';

interface IMigrationFunctionObject {
  [index: string]: [SEMVER, (manager: EntityManager) => Promise<void>];
}

interface ILegacyMigrationFunctionObject {
  [index: string]: [SEMVER, () => Promise<void>];
}

import { MongooseToNewMigrator } from './mongoose-to-newmongoose';
import { MongooseToPostgresMigrator } from './mongoose-to-postgres.migrator';

@Injectable()
export class DatabaseManagerService implements OnModuleInit {
  constructor(
    @Inject(DB_VERSION_REPOSITORY) private dbVersionRepository: IDBVersionRepository,
    @Inject(AppConfigService) private appConfigService: AppConfigService,
    // Mongoose connection for legacy support (if needed directly)
    @InjectConnection() private mongoConnection: Connection,
    // TypeORM connection for Postgres
    private dataSource: DataSource,
    private migrator: MongooseToPostgresMigrator,
    private mongooseMigrator: MongooseToNewMigrator,
    @InjectPinoLogger(DatabaseManagerService.name)
    private readonly logger: PinoLogger,
  ) {}

  private semverToString(version: SEMVER): string {
    return `${String(version.major)}.${String(version.minor)}.${String(version.patch)}`;
  }

  private isDbVersionAhead(dbVersion: SEMVER, packageVersion: SEMVER): boolean {
    if (dbVersion.major !== packageVersion.major) return dbVersion.major > packageVersion.major;
    if (dbVersion.minor !== packageVersion.minor) return dbVersion.minor > packageVersion.minor;
    return dbVersion.patch > packageVersion.patch;
  }

  async onModuleInit() {
    // MAKE SURE TO AWAIT
    await this.Bootstrap();
    this.logger.info('DatabaseManagerService initialized');
  }

  public async runDataMigration() {
    if (!this.appConfigService.usePostgres) {
      this.logger.warn('Skipping Mongoose->Postgres migration: USE_POSTGRES is false.');
      return;
    }
    await this.migrator.migrateAll();
  }

  private async hasTable(tableName: string): Promise<boolean> {
    const runner = this.dataSource.createQueryRunner();
    try {
      return await runner.hasTable(tableName);
    } finally {
      await runner.release();
    }
  }

  private SetVersion = async (new_version: SEMVER) => {
    return this.dbVersionRepository.set(new_version);
  };

  /**
   * PostgreSQL application data migrations (runs after schema migrations).
   * Format: 'current_version': [next_version, migration_function]
   *
   * Example:
   * '1.0.0': [{ major: 1, minor: 0, patch: 1 }, async (dataSource) => {
   *   // Run SQL or Repo commands
   * }]
   */
  private POSTGRES_MIGRATIONS: IMigrationFunctionObject = {
    // Add future migrations here
  };

  /**
   * LEGACY: Mongoose Migration Definitions.
   * Kept for historical reference or rollback scenarios.
   * WE DO NOT MIGRATE MONGOOSE SCHEMA ANYMORE.
   */
  private LEGACY_MONGOOSE_MIGRATIONS: ILegacyMigrationFunctionObject = {
    '0.6.4': [{ major: 0, minor: 6, patch: 8 }, async () => {}],
    '0.6.5': [{ major: 0, minor: 6, patch: 6 }, async () => {}],
    '0.6.6': [{ major: 0, minor: 6, patch: 7 }, async () => {}],
    '0.6.7': [{ major: 0, minor: 6, patch: 8 }, async () => {}],
    '0.6.8': [{ major: 0, minor: 6, patch: 9 }, async () => {}],
    '0.6.9': [
      { major: 0, minor: 6, patch: 10 },
      async () => {
        // 2025 Schema Migration: backfills children[], products[], options[], instances[]
        await this.mongooseMigrator.migrate2025Schema();
      },
    ],
  };

  /**
   * Bootstrap handles 4 initialization scenarios:
   *
   * EXISTING DATABASE (has version):
   *   - usePostgres=true  → Run postgres data migrations
   *   - usePostgres=false → Run legacy mongoose migrations
   *
   * FRESH INSTALL (no version):
   *   - usePostgres=true  + mongo data exists → Migrate from MongoDB
   *   - usePostgres=true  + no mongo data    → Seed default config
   *   - usePostgres=false + mongo data exists → Use mongoose (legacy mode)
   *   - usePostgres=false + no mongo data    → ERROR (unsupported)
   */
  Bootstrap = async () => {
    this.logger.info('>>> ENTERING BOOTSTRAP <<<');
    const [VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH] = PACKAGE_JSON.version.split('.', 3).map((x) => parseInt(x));
    const VERSION_PACKAGE: SEMVER = {
      major: VERSION_MAJOR,
      minor: VERSION_MINOR,
      patch: VERSION_PATCH,
    };

    // Load version from the DB (Unified Repository)
    this.logger.info(
      `Running database upgrade bootstrap. Mode: ${this.appConfigService.usePostgres ? 'POSTGRES' : 'MONGOOSE (Legacy)'}`,
    );

    let current_db_version = '0.0.0';
    let db_version: SEMVER | null = null;

    if (this.appConfigService.usePostgres) {
      // POSTGRES MODE
      // Migrations are run automatically by TypeOrmModule (migrationsRun: true)
      try {
        db_version = await this.dbVersionRepository.get();
      } catch (error: unknown) {
        // Assume table doesn't exist implies fresh install (or disaster)
        this.logger.warn({ error }, 'Failed to fetch DB Version. Assuming FRESH DATABASE.');
        await this.initializeFreshDatabase(VERSION_PACKAGE);
        return; // Initialization sets the version, so we are done for this run
      }

      if (!db_version) {
        this.logger.warn('DB version not found. Treating database as fresh.');
        await this.initializeFreshDatabase(VERSION_PACKAGE);
        return;
      }
    } else {
      // MONGOOSE (LEGACY) MODE
      db_version = await this.dbVersionRepository.get();

      if (!db_version) {
        // Fresh install in mongoose mode - check if mongo has any data
        const hasMongoData = await this.checkMongoHasData();
        if (!hasMongoData) {
          const msg =
            'UNSUPPORTED: Fresh install with USE_POSTGRES=false and no MongoDB data. ' +
            'Set USE_POSTGRES=true to initialize a new PostgreSQL database.';
          this.logger.error(msg);
          throw new Error(msg);
        }
        // Has mongo data but no version - this is case 4, continue with legacy mode
        this.logger.info('Fresh Mongoose database with existing data. Setting initial version.');
        await this.SetVersion(VERSION_PACKAGE);
        return;
      }
    }

    // At this point db_version is guaranteed to exist (other cases returned early)
    if (this.isDbVersionAhead(db_version, VERSION_PACKAGE)) {
      const msg = `Database version (${this.semverToString(db_version)}) is ahead of package version (${PACKAGE_JSON.version}). Refusing to start to avoid downgrade.`;
      this.logger.error(msg);
      throw new Error(msg);
    }
    current_db_version = `${String(db_version.major)}.${String(db_version.minor)}.${String(db_version.patch)}`;

    // Branching logic based on database backend
    if (this.appConfigService.usePostgres) {
      await this.runPostgresMigrations(current_db_version, PACKAGE_JSON.version, VERSION_PACKAGE);
    } else {
      await this.runLegacyMongooseMigrations(current_db_version, PACKAGE_JSON.version, VERSION_PACKAGE);
    }

    this.logger.info('Database upgrade checks completed.');
  };

  /**
   * Check if MongoDB has any data (Settings collection not empty).
   */
  private async checkMongoHasData(): Promise<boolean> {
    if ((this.mongoConnection.readyState as unknown as number) !== 1) {
      return false;
    }
    const settingsCount = await this.mongoConnection.collection('settings').countDocuments();
    return settingsCount > 0;
  }

  private initializeFreshDatabase = async (initialVersion: SEMVER) => {
    this.logger.info('Initializing Fresh Database...');

    // 1. Safety Guard
    await this.checkSafeToInitialize();

    const hasDbVersionTable = await this.hasTable('db_version');
    if (!hasDbVersionTable) {
      if (!this.appConfigService.allowSchemaSync) {
        const msg = 'Schema migrations did not create tables and ALLOW_SCHEMA_SYNC is false; refusing to synchronize.';
        this.logger.error(msg);
        throw new Error(msg);
      }
      this.logger.warn('Falling back to TypeORM synchronize() because no tables exist yet (dev-only).');
      await this.dataSource.synchronize(false);
    }

    // 2. Populate Data
    // Check if we should migrate from Mongo
    let migrated = false;
    if ((this.mongoConnection.readyState as unknown as number) === 1) {
      const settingsCount = await this.mongoConnection.collection('settings').countDocuments();
      if (settingsCount > 0) {
        this.logger.info('Legacy data detected in MongoDB. Starting Migration...');
        await this.migrator.migrateAll();
        migrated = true;
      }
    }

    if (!migrated) {
      this.logger.info('No legacy data found. Seeding Defaults...');
      await this.seedDefaults();
    }

    // 3. Set Version
    await this.SetVersion(initialVersion);
    this.logger.info({ initialVersion }, 'Fresh Initialization Completed. Setting to package version.');
  };

  private checkSafeToInitialize = async () => {
    // Check for existence of DATA in critical tables to prevent overwriting a DB that just has a missing version table
    // With migrationsRun: true, tables will always exist. We must check for ROWS.
    const runner = this.dataSource.createQueryRunner();
    try {
      const tables = ['orders', 'products', 'settings', 'printer_group', 'fulfillments', 'categories'];
      for (const table of tables) {
        const hasTable = await runner.hasTable(table);
        if (hasTable) {
          // Use quote for table name to handle case sensitivity if strict, though standard pg is lowercase
          const result = (await runner.query(`SELECT COUNT(*) as count FROM "${table}"`)) as [{ count: string }];
          const count = parseInt(result[0].count, 10);
          if (count > 0) {
            const msg = `CRITICAL ERROR: Table '${table}' has ${String(count)} rows but DBVersion table was missing/unreadable. Refusing to initialize to prevent data loss.`;
            this.logger.fatal(msg);
            throw new Error(msg);
          }
        }
      }
    } finally {
      await runner.release();
    }
  };

  private seedDefaults = async () => {
    await this.dataSource.transaction(async (manager) => {
      // 1. Default Settings
      const settings = manager.create(SettingsEntity, {
        config: {}, // Defaults
      });
      await manager.save(SettingsEntity, settings);
    });
    this.logger.info('Seeded default data (Settings, PrinterGroup).');
  };

  private runPostgresMigrations = async (currentVersion: string, targetVersionStr: string, targetVersion: SEMVER) => {
    let current = currentVersion;

    while (targetVersionStr !== current) {
      if (Object.hasOwn(this.POSTGRES_MIGRATIONS, current)) {
        const [next_ver, migration_function] = this.POSTGRES_MIGRATIONS[current];
        const next_ver_string = `${String(next_ver.major)}.${String(next_ver.minor)}.${String(next_ver.patch)}`;

        this.logger.info(`Running POSTGRES data migration from ${current} to ${next_ver_string}`);

        // Execute step in a transaction
        await this.dataSource.transaction(async (manager) => {
          // 1. Run the migration function using the transactional manager
          await migration_function(manager);

          // 2. Update the DB Version within the SAME transaction
          // We bypass the repository to ensure we use the transactional manager
          const versionRepo = manager.getRepository(DBVersionEntity);
          let versionEntity = await versionRepo.findOne({ where: {} });

          if (!versionEntity) {
            versionEntity = versionRepo.create(next_ver);
          } else {
            versionRepo.merge(versionEntity, next_ver);
          }
          await versionRepo.save(versionEntity);
        });

        current = next_ver_string;
      } else {
        // No explicit migration path found implies a clean update (or dev jump)
        // In a strict prod environment we might want to throw, but following existing pattern:
        this.logger.warn(
          `No explicit Postgres data migration from ${current} to ${targetVersionStr}, setting to new version (No-Op).`,
        );
        await this.SetVersion(targetVersion);
        current = targetVersionStr;
      }
    }
  };

  private runLegacyMongooseMigrations = async (
    currentVersion: string,
    targetVersionStr: string,
    targetVersion: SEMVER,
  ) => {
    let current = currentVersion;

    while (targetVersionStr !== current) {
      if (Object.hasOwn(this.LEGACY_MONGOOSE_MIGRATIONS, current)) {
        const [next_ver, migration_function] = this.LEGACY_MONGOOSE_MIGRATIONS[current];
        const next_ver_string = `${String(next_ver.major)}.${String(next_ver.minor)}.${String(next_ver.patch)}`;

        this.logger.info(`Running LEGACY MONGOOSE migration from ${current} to ${next_ver_string}`);

        await migration_function();
        await this.SetVersion(next_ver);
        current = next_ver_string;
      } else {
        this.logger.warn(
          `No explicit Mongoose migration from ${current} to ${targetVersionStr}, setting to new version.`,
        );
        await this.SetVersion(targetVersion);
        current = targetVersionStr;
      }
    }
  };
}
