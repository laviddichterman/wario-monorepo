# Create wario-bridge and wario-shared-private

Create a new NestJS edge-server application (`wario-bridge`) for restaurant message routing between ticket printers, KDS tablets, and wario-pos users. Also create a shared package (`wario-shared-private`) for internal code shared between wario-pos, wario-backend, and wario-bridge.

## User Review Required

> [!IMPORTANT]
> **Naming Convention**: This plan uses `@wcp/wario-shared-private` for the package name. Confirm this is the desired naming.

> [!IMPORTANT]
> **Scope**: This plan creates a minimal, buildable skeleton for both packages. The actual messaging logic (printer protocols, KDS communication, WebSocket routing) will be added in subsequent tasks.

---

## Proposed Changes

### wario-shared-private Package

Create a new shared library at `packages/wario-shared-private` for private, internal types shared between backend apps.

#### [NEW] [package.json](file:///Users/lavid/Documents/wario-monorepo/packages/wario-shared-private/package.json)

- Name: `@wcp/wario-shared-private`
- Type: ESM module with CJS fallback
- Dependencies: `class-validator`, `class-transformer`, `reflect-metadata`
- Build: tsup (following wario-shared pattern)

#### [NEW] [tsconfig.json](file:///Users/lavid/Documents/wario-monorepo/packages/wario-shared-private/tsconfig.json)

- Extends `../../tsconfig.base.json`
- Enables decorator metadata for potential DTOs

#### [NEW] [tsup.config.ts](file:///Users/lavid/Documents/wario-monorepo/packages/wario-shared-private/tsup.config.ts)

- Single entry point initially
- Outputs ESM (`.js`) and CJS (`.cjs`)

#### [NEW] [eslint.config.js](file:///Users/lavid/Documents/wario-monorepo/packages/wario-shared-private/eslint.config.js)

- Standard TypeScript ESLint config

#### [NEW] [src/index.ts](file:///Users/lavid/Documents/wario-monorepo/packages/wario-shared-private/src/index.ts)

- Main entry point, exports all types

#### [NEW] [src/lib/bridge-messages.ts](file:///Users/lavid/Documents/wario-monorepo/packages/wario-shared-private/src/lib/bridge-messages.ts)

- Placeholder types for bridge messaging:
  - `BridgeMessage` - base message type
  - `PrinterMessage` - ticket printer messages
  - `KdsMessage` - KDS tablet messages
  - `PosMessage` - POS client messages

#### [NEW] [AGENT_GUIDE.md](file:///Users/lavid/Documents/wario-monorepo/packages/wario-shared-private/AGENT_GUIDE.md)

- Package overview and conventions

---

### wario-bridge Application

Create a new NestJS application at `apps/wario-bridge` as an edge server.

#### [NEW] [package.json](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/package.json)

- Name: `@wcp/wario-bridge`
- Core NestJS dependencies (matching wario-backend versions)
- Socket.IO for real-time communication
- Depends on `@wcp/wario-shared-private`
- Scripts: `start`, `start:dev`, `start:debug`, `build`, `lint`, `test`, `typecheck`

#### [NEW] [tsconfig.json](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/tsconfig.json)

- Module: nodenext
- Decorators enabled
- Target: ES2023

#### [NEW] [tsconfig.build.json](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/tsconfig.build.json)

- Excludes test files from build

#### [NEW] [nest-cli.json](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/nest-cli.json)

- Standard NestJS CLI configuration

#### [NEW] [eslint.config.mjs](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/eslint.config.mjs)

- ESLint config matching wario-backend pattern

#### [NEW] [src/main.ts](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/src/main.ts)

- NestJS bootstrap with pino logger
- CORS enabled
- Configurable port

#### [NEW] [src/app.module.ts](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/src/app.module.ts)

- ConfigModule for environment
- LoggerModule (nestjs-pino)
- Future: Gateway modules for WebSocket communication

#### [NEW] [src/app.controller.ts](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/src/app.controller.ts)

- Health check endpoint (`GET /`)

#### [NEW] [src/app.service.ts](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/src/app.service.ts)

- Basic service placeholder

#### [NEW] [src/config/app-config.service.ts](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/src/config/app-config.service.ts)

- Configuration service for environment variables
- Port, backend URL, CORS origins

#### [NEW] [src/config/config.module.ts](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/src/config/config.module.ts)

- NestJS module exporting config service

#### [NEW] [.env.example](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/.env.example)

- Template for required environment variables

#### [NEW] [AGENT_GUIDE.md](file:///Users/lavid/Documents/wario-monorepo/apps/wario-bridge/AGENT_GUIDE.md)

- Application overview, architecture, conventions

---

### Root-Level Integration

#### [MODIFY] [package.json](file:///Users/lavid/Documents/wario-monorepo/package.json)

Add `bridge:*` scripts:

```json
"bridge:build": "pnpm --filter ./apps/wario-bridge build",
"bridge:dev": "pnpm --filter ./apps/wario-bridge start:debug",
"bridge:lint": "pnpm --filter ./apps/wario-bridge lint",
"bridge:start": "pnpm --filter ./apps/wario-bridge start",
"bridge:test": "pnpm --filter ./apps/wario-bridge test",
"bridge:typecheck": "pnpm --filter ./apps/wario-bridge typecheck"
```

#### [MODIFY] [.agent/rules/repository-map.md](file:///Users/lavid/Documents/wario-monorepo/.agent/rules/repository-map.md)

Add entries for:

- `apps/wario-bridge`
- `packages/wario-shared-private`

---

## Verification Plan

### Automated Verification

```bash
# 1. Install dependencies and link workspaces
pnpm install

# 2. Build the shared-private package
pnpm --filter @wcp/wario-shared-private build

# 3. Build the bridge application
pnpm bridge:build

# 4. Type-check both packages
pnpm --filter @wcp/wario-shared-private typecheck
pnpm bridge:typecheck

# 5. Lint both packages
pnpm --filter @wcp/wario-shared-private lint
pnpm bridge:lint
```

### Manual Verification

1. **Start the bridge server**:
   ```bash
   pnpm bridge:dev
   ```
2. **Verify health endpoint**: Open `http://localhost:3001/` in browser or curl - should return "OK" or similar health response.
3. **Check logs**: Confirm pino-pretty formatted logs appear in terminal.
