
// Explicitly set environment variables for E2E testing
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_USER = 'wario_e2e';
process.env.POSTGRES_PASSWORD = 'e2e';
process.env.POSTGRES_DB = 'wario_e2e';
process.env.USE_POSTGRES = 'true';
process.env.ALLOW_SCHEMA_SYNC = 'true';
process.env.DBTABLE = 'wcpdev';
process.env.MONGO_URI = 'mongodb://localhost:27017/wcpdev';
process.env.TEST_MIGRATION = 'true';