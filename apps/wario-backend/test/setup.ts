import { TextDecoder, TextEncoder } from 'util';

// Mock localStorage for Node.js v25+ which has Web Storage API but throws SecurityError
// when accessed without --localstorage-file flag
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

global.TextEncoder = TextEncoder;
// @ts-expect-error - TextDecoder type mismatch in global
global.TextDecoder = TextDecoder;

// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console output during tests (optional, comment out if you need logs)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Clean up after all tests
afterAll(async () => {
  // Allow pending promises to resolve
  await new Promise((resolve) => setTimeout(resolve, 100));
});
