/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Use a test-specific tsconfig so Jest knows about "jest" globals
        tsconfig: '<rootDir>/tsconfig.test.json',
        isolatedModules: true
        // NOTE: we compile tests to CJS under the hood for maximum compatibility
        // (no need for useESM here).
      }
    ]
  },
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}'],
  coverageDirectory: '<rootDir>/coverage',
  // Optional niceties:
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
