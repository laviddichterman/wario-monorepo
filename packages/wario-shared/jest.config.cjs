/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: '<rootDir>/jest-environment.cjs',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Use a test-specific tsconfig so Jest knows about "jest" globals
        tsconfig: '<rootDir>/tsconfig.test.json',
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
