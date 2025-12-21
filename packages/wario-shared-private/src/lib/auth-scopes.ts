/**
 * Auth0 Scope Constants
 *
 * All valid Auth0 scopes used by the wario platform.
 * Use these constants instead of raw strings to get:
 * - TypeScript autocomplete
 * - Compile-time type checking
 * - Prevention of typos that cause silent failures
 */
export const AuthScopes = {
  // Settings
  READ_SETTINGS: 'read:settings',
  WRITE_SETTINGS: 'write:settings',

  // Orders
  READ_ORDER: 'read:order',
  WRITE_ORDER: 'write:order',
  CANCEL_ORDER: 'cancel:order',
  SEND_ORDER: 'send:order',

  // Catalog
  READ_CATALOG: 'read:catalog',
  WRITE_CATALOG: 'write:catalog',
  DELETE_CATALOG: 'delete:catalog',

  // Config
  WRITE_ORDER_CONFIG: 'write:order_config',
  WRITE_CONFIG: 'write:config',
  DELETE_CONFIG: 'delete:config',

  // Store Credit
  EDIT_STORE_CREDIT: 'edit:store_credit',
} as const;

/** Union type of all valid Auth0 scopes */
export type AuthScope = (typeof AuthScopes)[keyof typeof AuthScopes];
