# GEMINI.md

This is an AI-agent instruction file for Gemini Code Assist. Read `.agent/rules/*.md` for complete conventions and workflows.

## Quick Context

**What is this?** A pizza restaurant platform monorepo containing backend API, staff POS, and customer-facing apps.

## Repository Structure

```
wario-monorepo/
├── apps/
│   ├── wario-backend/     # NestJS API (orders, catalog, auth)
│   ├── wario-pos/         # Staff POS (React, Jotai, MUI)
│   ├── wario-fe-order/    # Customer ordering (React, Zustand)
│   ├── wario-fe-menu/     # Read-only menu viewer
│   ├── wario-fe-credit/   # Store credit purchase
│   └── wario-fe-faq/      # FAQ pages
├── packages/
│   ├── wario-shared/      # DTOs, types, domain logic (no UI)
│   ├── wario-ux-shared/   # Internal UI components, hooks
│   └── wario-fe-ux-shared/# Customer-facing UI components
├── e2e/                   # Playwright tests
└── .agent/                # Agent rules and workflows
```

Each package has an `AGENT_GUIDE.md` with detailed architecture.

## Tech Stack

| Layer     | Tech                                        |
| :-------- | :------------------------------------------ |
| Backend   | NestJS, MongoDB (Mongoose), Socket.IO, Pino |
| Frontend  | React 19, Vite, MUI v5/v6, Emotion          |
| Forms     | react-hook-form + zod                       |
| API State | TanStack Query (source of truth)            |
| App State | Zustand (global/wizard) or Jotai (UI atoms) |

> **Redux is banned.** Do not write new Redux code.

## Critical Rules

1. **No `console.log`** — Backend: use `this.logger` (nestjs-pino). Frontend: `console.error` only for fatal errors.
2. **No `any`** — Use `unknown` and narrow. Fix type errors; don't suppress.
3. **Idempotency-Key header** — Required for all mutation API calls.
4. **File naming** — Components: `PascalCase.tsx`, Hooks: `camelCase.ts`, Utils: `kebab-case.ts`.
5. **DTOs in shared** — API-used DTOs belong in `packages/wario-shared`.
6. **Test before closing** — Run `pnpm test` or `pnpm e2e` for business logic changes.

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm backend:start    # Start backend (dev)
pnpm pos:dev          # Start POS
pnpm order:dev        # Start customer ordering
pnpm dev              # Start all apps
pnpm backend:test     # Unit tests
pnpm e2e              # E2E tests (mocked)
pnpm e2e:integration  # E2E tests (live backend)
```

## Agent Workflows

See `.agent/workflows/` for task-specific guides:

- `e2e-testing.md` — E2E test patterns
- `unit-testing.md` — Backend unit tests
- `react-testing.md` — React component tests
- `ui-testing.md` — Manual UI verification
- `post-task-review.md` — Mandatory self-review before completion
- `create-changeset.md` — Creating changesets

## Documentation Standards

- Every package has an `AGENT_GUIDE.md` — Keep these updated.
- **Task Planning Artifacts**: For tasks requiring planning:
  1. **Single-package work**: Create a subdirectory in `<package>/documentation/` for the task.
  2. **Multi-package work**: Create a subdirectory in the root `documentation/` folder.
  3. Place all planning artifacts (`task.md`, `implementation_plan.md`, `walkthrough.md`) in that folder — **not** in a private agent directory.
