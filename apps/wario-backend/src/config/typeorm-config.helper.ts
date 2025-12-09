import * as path from 'path';

import { ConfigService } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';

import { AppConfigService } from './app-config.service';

/**
 * Base TypeORM configuration values extracted from environment.
 * This interface mirrors the postgres config getters in AppConfigService.
 */
export interface TypeOrmConfigValues {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  isProduction: boolean;
}

/**
 * Options for building TypeORM DataSourceOptions.
 */
export interface TypeOrmConfigOptions {
  /**
   * Whether to run migrations automatically on connection.
   * Typically false for CLI migrations, true for app startup.
   */
  migrationsRun?: boolean;

  /**
   * Whether to use synchronize mode (auto-create schema from entities).
   * Should only be true in development/testing.
   */
  synchronize?: boolean;

  /**
   * Custom entities glob patterns. Defaults to the standard entity location.
   */
  entities?: string[];

  /**
   * Custom migrations glob patterns. Defaults to the standard migration locations.
   */
  migrations?: string[];
}

/**
 * Default glob patterns for entities when running from source (ts-node, tests).
 */
const DEFAULT_ENTITIES_SOURCE = ['src/entities/**/*.entity.ts'];

/**
 * Default glob patterns for entities when running from compiled output.
 */
const DEFAULT_ENTITIES_COMPILED = ['dist/src/entities/**/*.entity.js'];

/**
 * Default glob patterns for migrations.
 * Includes both source and compiled locations for CLI compatibility.
 */
const DEFAULT_MIGRATIONS = [
  'src/migrations/**/*.ts',
  'dist/src/migrations/**/*.js',
];

/**
 * Determines entity paths based on the caller location.
 * When called from app.module.ts (via __dirname), uses relative path with glob.
 * When called from CLI (ormconfig.ts), uses source/dist patterns.
 */
function resolveEntityPaths(dirname?: string): string[] {
  if (dirname) {
    return [path.join(dirname, 'entities/**/*.entity{.ts,.js}')];
  }
  return [...DEFAULT_ENTITIES_SOURCE, ...DEFAULT_ENTITIES_COMPILED];
}

/**
 * Determines migration paths based on the caller location.
 */
function resolveMigrationPaths(dirname?: string): string[] {
  if (dirname) {
    return [path.join(dirname, 'migrations/**/*{.ts,.js}')];
  }
  return DEFAULT_MIGRATIONS;
}

/**
 * Creates TypeORM DataSourceOptions from configuration values.
 *
 * This helper centralizes TypeORM configuration to ensure consistency between:
 * - NestJS TypeOrmModule.forRootAsync (app.module.ts)
 * - TypeORM CLI migrations (ormconfig.ts)
 *
 * @param config - The configuration values (from env or AppConfigService)
 * @param options - Additional options for the DataSource
 * @param dirname - Optional __dirname for resolving entity/migration paths relative to caller
 * @returns DataSourceOptions ready for use with DataSource or TypeOrmModule
 *
 * @example
 * // From ormconfig.ts (CLI):
 * const options = buildTypeOrmConfig(getEnvConfig());
 * export const AppDataSource = new DataSource(options);
 *
 * @example
 * // From app.module.ts (NestJS):
 * TypeOrmModule.forRootAsync({
 *   useFactory: (appConfig: AppConfigService) => buildTypeOrmConfig(
 *     getConfigValuesFromService(appConfig),
 *     { migrationsRun: true, synchronize: false },
 *     __dirname
 *   ),
 * })
 */
export function buildTypeOrmConfig(
  config: TypeOrmConfigValues,
  options: TypeOrmConfigOptions = {},
  dirname?: string,
): DataSourceOptions {
  const {
    migrationsRun = false,
    synchronize = false,
    entities,
    migrations,
  } = options;

  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    entities: entities ?? resolveEntityPaths(dirname),
    migrations: migrations ?? resolveMigrationPaths(dirname),
    migrationsTableName: 'typeorm_migrations',
    migrationsRun,
    synchronize,
    logging: !config.isProduction,
  };
}

/**
 * Creates a standalone AppConfigService instance for use outside NestJS.
 * Manually initializes ConfigService with process.env values.
 * 
 * Use this in CLI contexts (ormconfig.ts) to get the exact same config
 * logic as the NestJS runtime.
 * 
 * @example
 * // In ormconfig.ts:
 * const appConfig = createStandaloneAppConfig();
 * const options = buildTypeOrmConfig({
 *   host: appConfig.postgresHost,
 *   port: appConfig.postgresPort,
 *   // ... etc
 * });
 */
export function createStandaloneAppConfig(): AppConfigService {

  const configService = new ConfigService(process.env);
  return new AppConfigService(configService);
}