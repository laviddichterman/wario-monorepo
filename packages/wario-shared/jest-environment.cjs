/**
 * Custom Jest environment to work around Node.js v25+ localStorage initialization issue
 * See: https://github.com/jestjs/jest/issues/15616
 */
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
const NodeEnvironment = require('jest-environment-node').TestEnvironment;

class CustomEnvironment extends NodeEnvironment {
  constructor(config, context) {
    // Delete localStorage property descriptor before calling super to prevent initialization error
    const descriptor = Object.getOwnPropertyDescriptor(global, 'localStorage');
    if (descriptor) {
      delete global.localStorage;
    }

    super(config, context);

    // Restore descriptor if needed (usually not necessary for tests)
    // if (descriptor) {
    //   Object.defineProperty(global, 'localStorage', descriptor);
    // }
  }
}

module.exports = CustomEnvironment;
