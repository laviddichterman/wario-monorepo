const NodeEnvironment = require('jest-environment-node').default;

// Patch localStorage before the parent class accesses it
// This is needed for Node.js v25+ which has Web Storage API globally
// but throws SecurityError without --localstorage-file flag
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

class CustomNodeEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
  }
}

module.exports = CustomNodeEnvironment;
