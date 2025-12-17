/**
 * E2E Test Database Configuration
 *
 * IMPORTANT: All E2E database configuration should be imported from here.
 * This prevents tests from accidentally wiping development/production databases.
 *
 * These databases are EXCLUSIVELY for E2E testing and will be wiped during test runs.
 */

// =============================================================================
// MongoDB Configuration (for migration tests and legacy data seeding)
// =============================================================================
export const E2E_MONGO_HOST = 'localhost';
export const E2E_MONGO_PORT = 27017;
export const E2E_MONGO_DB = 'wario_e2e'; // Dedicated test database, NOT wcpdev!
export const E2E_MONGO_URI = `mongodb://${E2E_MONGO_HOST}:${String(E2E_MONGO_PORT)}/${E2E_MONGO_DB}`;

// =============================================================================
// PostgreSQL Configuration
// =============================================================================
export const E2E_POSTGRES_HOST = 'localhost';
export const E2E_POSTGRES_PORT = 5432;
export const E2E_POSTGRES_USER = 'wario_e2e';
export const E2E_POSTGRES_PASSWORD = 'e2e';
export const E2E_POSTGRES_DB = 'wario_e2e';

// =============================================================================
// Feature Flags for E2E
// =============================================================================
export const E2E_USE_POSTGRES = true;
export const E2E_ALLOW_SCHEMA_SYNC = true;
export const E2E_TEST_MIGRATION = true;

/**
 * Sets all E2E environment variables.
 * Called from setup-env.ts before tests run.
 */
export function setE2EEnvironment(): void {
  // MongoDB
  process.env.DBENDPOINT = `${E2E_MONGO_HOST}:${String(E2E_MONGO_PORT)}`;
  process.env.DBTABLE = E2E_MONGO_DB;
  process.env.MONGO_URI = E2E_MONGO_URI;

  // PostgreSQL
  process.env.POSTGRES_HOST = E2E_POSTGRES_HOST;
  process.env.POSTGRES_PORT = String(E2E_POSTGRES_PORT);
  process.env.POSTGRES_USER = E2E_POSTGRES_USER;
  process.env.POSTGRES_PASSWORD = E2E_POSTGRES_PASSWORD;
  process.env.POSTGRES_DB = E2E_POSTGRES_DB;

  // Feature flags
  process.env.USE_POSTGRES = String(E2E_USE_POSTGRES);
  process.env.ALLOW_SCHEMA_SYNC = String(E2E_ALLOW_SCHEMA_SYNC);
  process.env.TEST_MIGRATION = String(E2E_TEST_MIGRATION);
}
