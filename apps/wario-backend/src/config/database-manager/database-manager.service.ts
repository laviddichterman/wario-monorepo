import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';

import { SEMVER } from '@wcp/wario-shared';

import PACKAGE_JSON from '../../../package.json';
import { DB_VERSION_REPOSITORY } from '../../repositories/interfaces/db-version.repository.interface';
import type { IDBVersionRepository } from '../../repositories/interfaces/db-version.repository.interface';
import { AppConfigService } from '../app-config.service';

interface IMigrationFunctionObject {
  [index: string]: [SEMVER, (dataSource: DataSource) => Promise<void>];
}

interface ILegacyMigrationFunctionObject {
  [index: string]: [SEMVER, () => Promise<void>];
}

@Injectable()
export class DatabaseManagerService implements OnModuleInit {
  constructor(
    @Inject(DB_VERSION_REPOSITORY) private dbVersionRepository: IDBVersionRepository,
    @Inject(AppConfigService) private appConfigService: AppConfigService,
    // Mongoose connection for legacy support (if needed directly)
    @InjectConnection() private mongoConnection: Connection,
    // TypeORM connection for Postgres
    private dataSource: DataSource,
    @InjectPinoLogger(DatabaseManagerService.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit() {
    await this.Bootstrap();
  }

  private SetVersion = async (new_version: SEMVER) => {
    return this.dbVersionRepository.set(new_version);
  };

  /**
   * PostgreSQL Migration Definitions.
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
    '0.6.8': [{ major: 0, minor: 6, patch: 9 }, async () => {}],
  };

  Bootstrap = async () => {
    const [VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH] = PACKAGE_JSON.version.split('.', 3).map((x) => parseInt(x));
    const VERSION_PACKAGE: SEMVER = {
      major: VERSION_MAJOR,
      minor: VERSION_MINOR,
      patch: VERSION_PATCH,
    };

    // Load version from the DB (Unified Repository)
    this.logger.info(`Running database upgrade bootstrap. Mode: ${this.appConfigService.usePostgres ? 'POSTGRES' : 'MONGOOSE (Legacy)'}`);

    let current_db_version = '0.0.0';
    const db_version = await this.dbVersionRepository.get();

    if (db_version) {
      current_db_version = `${String(db_version.major)}.${String(db_version.minor)}.${String(db_version.patch)}`;
    }

    // Branching logic based on database backend
    if (this.appConfigService.usePostgres) {
      await this.runPostgresMigrations(current_db_version, PACKAGE_JSON.version, VERSION_PACKAGE);
    } else {
      await this.runLegacyMongooseMigrations(current_db_version, PACKAGE_JSON.version, VERSION_PACKAGE);
    }

    this.logger.info('Database upgrade checks completed.');
  };

  private runPostgresMigrations = async (currentVersion: string, targetVersionStr: string, targetVersion: SEMVER) => {
    let current = currentVersion;

    while (targetVersionStr !== current) {
      if (Object.hasOwn(this.POSTGRES_MIGRATIONS, current)) {
        const [next_ver, migration_function] = this.POSTGRES_MIGRATIONS[current];
        const next_ver_string = `${String(next_ver.major)}.${String(next_ver.minor)}.${String(next_ver.patch)}`;

        this.logger.info(`Running POSTGRES migration from ${current} to ${next_ver_string}`);

        // Execute migration with DataSource
        await migration_function(this.dataSource);

        // Update version
        await this.SetVersion(next_ver);
        current = next_ver_string;
      } else {
        // No explicit migration path found implies a clean update (or dev jump)
        // In a strict prod environment we might want to throw, but following existing pattern:
        this.logger.warn(
          `No explicit Postgres migration from ${current} to ${targetVersionStr}, setting to new version (No-Op).`,
        );
        await this.SetVersion(targetVersion);
        current = targetVersionStr;
      }
    }
  }

  private runLegacyMongooseMigrations = async (currentVersion: string, targetVersionStr: string, targetVersion: SEMVER) => {
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
  }
}
