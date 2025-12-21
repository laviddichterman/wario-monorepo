# Task: Create wario-bridge and wario-shared-private

## Overview

Create a new NestJS application (`wario-bridge`) and a new shared package (`wario-shared-private`) for the wario-monorepo.

## Checklist

### 1. Create wario-shared-private Package

- [x] Create package directory structure at `packages/wario-shared-private`
- [x] Create `package.json` with proper workspace dependencies
- [x] Create `tsconfig.json` extending base config
- [x] Create `tsup.config.ts` for ESM/CJS builds
- [x] Create `eslint.config.js`
- [x] Create `src/index.ts` entry point
- [x] Create placeholder types for bridge messaging
- [x] Create `AGENT_GUIDE.md`

### 2. Create wario-bridge Application

- [x] Create application directory structure at `apps/wario-bridge`
- [x] Create `package.json` with NestJS dependencies
- [x] Create `tsconfig.json` and `tsconfig.build.json`
- [x] Create `nest-cli.json`
- [x] Create `eslint.config.mjs`
- [x] Create `src/main.ts` entry point
- [x] Create `src/app.module.ts`
- [x] Create `src/app.controller.ts` and `src/app.service.ts`
- [x] Create config module for environment variables
- [x] Create `AGENT_GUIDE.md`

### 3. Add Root-Level Integration

- [x] Add `bridge:*` scripts to root `package.json`
- [ ] Update `GEMINI.md` with new packages (gitignored - skipped)
- [ ] Update `.agent/rules/repository-map.md` (gitignored - skipped)

### 4. Verification

- [x] Run `pnpm install` to link workspaces
- [x] Build `wario-shared-private` package
- [x] Build `wario-bridge` application
- [x] Start `wario-bridge` in dev mode - health endpoint returns "OK"
- [x] Run typecheck on both new packages
