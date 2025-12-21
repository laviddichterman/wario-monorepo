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
    └── bridge-messages.ts # Message types for printer, KDS, POS communication
```

## Key Types

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
