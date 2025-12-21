# wario-shared-private Agent Guide

## Overview

`@wcp/wario-shared-private` is an internal, private package containing shared types and utilities between:

- **wario-backend** - Main API server
- **wario-bridge** - Edge server for restaurant device communication
- **wario-pos** - Staff Point of Sale application

Unlike `@wcp/wario-shared` (which is published to npm), this package is kept private for internal-only types.

## Purpose

This package primarily contains:

1. **Bridge Message Types** - Protocol definitions for communication between wario-bridge and connected devices
2. **Internal DTOs** - Data transfer objects not exposed in the public API
3. **Shared Utilities** - Helper functions used across backend apps

## Architecture

```
src/
├── index.ts              # Main entry point
└── lib/
    ├── bridge-messages.ts # Message types for printer, KDS, POS communication
    └── auth-scopes.ts     # Auth0 scope constants and types
```

## Key Types

### Auth Scopes

The `auth-scopes.ts` file provides type-safe Auth0 scope constants:

| Constant             | Value                | Usage                          |
| -------------------- | -------------------- | ------------------------------ |
| `READ_SETTINGS`      | `read:settings`      | Read KV store, seating layouts |
| `WRITE_SETTINGS`     | `write:settings`     | Update KV store                |
| `READ_ORDER`         | `read:order`         | Fetch orders                   |
| `WRITE_ORDER`        | `write:order`        | Confirm, reschedule, move      |
| `CANCEL_ORDER`       | `cancel:order`       | Cancel orders                  |
| `SEND_ORDER`         | `send:order`         | Force send to kitchen          |
| `WRITE_CATALOG`      | `write:catalog`      | Create/update menu items       |
| `DELETE_CATALOG`     | `delete:catalog`     | Delete menu items              |
| `WRITE_CONFIG`       | `write:config`       | Update fulfillments            |
| `DELETE_CONFIG`      | `delete:config`      | Delete fulfillments            |
| `WRITE_ORDER_CONFIG` | `write:order_config` | Lead times, block-offs         |
| `EDIT_STORE_CREDIT`  | `edit:store_credit`  | Issue/redeem store credits     |

**Usage:**

```typescript
import { AuthScopes } from '@wcp/wario-shared-private';

// In wario-pos hooks:
const token = await getToken(AuthScopes.WRITE_CATALOG);

// In wario-backend controllers:
@Scopes(AuthScopes.WRITE_CATALOG)
```

### Bridge Messages

The `bridge-messages.ts` file defines the messaging protocol:

| Type             | Purpose                            |
| ---------------- | ---------------------------------- |
| `PrinterMessage` | Communication with ticket printers |
| `KdsMessage`     | Communication with KDS tablets     |
| `PosMessage`     | Updates sent to POS clients        |

## Development

```bash
# Build the package
pnpm --filter @wcp/wario-shared-private build

# Type-check
pnpm --filter @wcp/wario-shared-private typecheck

# Lint
pnpm --filter @wcp/wario-shared-private lint
```

## Conventions

1. **Private Only**: Never publish this package. It should remain `"private": true`.
2. **No Runtime Dependencies**: Keep this package lean - types and pure functions only.
3. **Decorator Support**: Decorators are enabled for potential class-validator DTOs.

## Adding New Types

1. Create a new file in `src/lib/` for related types
2. Export from `src/index.ts`
3. Run `pnpm build` to regenerate declarations
