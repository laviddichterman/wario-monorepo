/**
 * Logic/utilities entry point for wario-shared.
 *
 * This entry point exports pure utility functions, domain logic, and helper classes.
 * It does NOT include any class-validator/class-transformer decorated DTO classes,
 * allowing frontend consumers to import business logic without bundling validation dependencies.
 *
 * Usage:
 *   import { WDateUtils, ComputeCartSubTotal, WProductEquals } from '@wcp/wario-shared/logic';
 */

export * from './lib/common';
export * from './lib/derived-types';
export * from './lib/enums';
export * from './lib/modifiers';
export * from './lib/numbers';
export * from './lib/objects/ICatalog';
export * from './lib/objects/OrderFunctional';
export * from './lib/objects/WCPOption';
export * from './lib/objects/WCPProduct';
export * from './lib/objects/WDateUtils';
export * from './lib/objects/WFunctional';
export * from './lib/objects/WMenu';
export * from './lib/types';
export * from './lib/utility-types';
