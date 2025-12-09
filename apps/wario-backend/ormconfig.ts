import * as path from 'path';

import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { buildTypeOrmConfig, createStandaloneAppConfig } from './src/config/typeorm-config.helper';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// TypeORM CLI configuration for migrations
// Used by: npx typeorm migration:run -d ormconfig.ts

const appConfig = createStandaloneAppConfig();

const options = buildTypeOrmConfig(
  {
    host: appConfig.postgresHost,
    port: appConfig.postgresPort,
    username: appConfig.postgresUser,
    password: appConfig.postgresPassword,
    database: appConfig.postgresDatabase,
    isProduction: appConfig.isProduction,
  },
  {
    // CLI should never auto-run migrations or synchronize
    migrationsRun: false,
    synchronize: false,
  },
);

export const AppDataSource = new DataSource(options);
export default options;
