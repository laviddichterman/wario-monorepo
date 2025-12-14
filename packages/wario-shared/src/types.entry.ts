/**
 * Types-only entry point for wario-shared.
 *
 * This entry point exports only pure interfaces, type aliases, and enums.
 * It does NOT include any class-validator/class-transformer decorated DTO classes,
 * allowing frontend consumers to import types without bundling validation dependencies.
 *
 * Usage:
 *   import type { IProduct, ICategory } from '@wcp/wario-shared/types';
 *   import { FulfillmentType, DISABLE_REASON } from '@wcp/wario-shared/types';
 */

// Pure interfaces derived from DTOs (uses `import type` internally - no runtime dep)
export * from './lib/derived-types';

// All enums (pure values, no decorators)
export * from './lib/enums';

// Utility and composition types (no DTO dependencies)
export * from './lib/types';

// Utility type helpers
export * from './lib/utility-types';
