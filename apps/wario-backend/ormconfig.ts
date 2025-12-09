import * as path from 'path';

import * as dotenv from 'dotenv';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// TypeORM CLI configuration for migrations
// Used by: npx typeorm migration:run -d ormconfig.ts

const options: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'wario',
  password: process.env.POSTGRES_PASSWORD || '',
  database: process.env.POSTGRES_DB || 'wario',
  entities: ['src/entities/**/*.entity.ts'],
  migrations: ['src/migrations/**/*.ts', 'dist/src/migrations/**/*.js'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false, // Always use migrations in production
  logging: process.env.NODE_ENV !== 'production',
};

export const AppDataSource = new DataSource(options);
export default options;
