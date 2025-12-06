---
trigger: always_on
---

# Development Workflow

## Prerequisites

- **Node.js**: v20+ (LTS recommended)
- **pnpm**: v8+ (`npm install -g pnpm`)
- **MongoDB**: Local or Docker instance for backend

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd wario-monorepo

# Install all dependencies
pnpm install

# Copy environment template (if exists)
cp apps/wario-backend/.env.example apps/wario-backend/.env
# Edit .env with your local values
```

## Running Applications

Run scripts from the root using `pnpm <script_name>`:

```bash
# Start the Backend (dev mode with watch)
pnpm backend:start

# Start the POS
pnpm pos:dev

# Start the Ordering App
pnpm order:dev

# Start all apps in parallel
pnpm dev
```

## Testing

### Unit Tests (Jest)

Located alongside source files (`*.spec.ts`).

```bash
pnpm backend:test
```

### E2E Tests (Playwright)

Located in root `e2e/`.

```bash
# Run all E2E tests (Mocked mode)
pnpm e2e

# Run integration tests (Live backend)
pnpm e2e:integration

# Interactive UI mode
pnpm e2e:ui

# Debug mode
pnpm e2e --debug
```

## Adding Dependencies

Always use `pnpm add` at the package level.

```bash
cd apps/wario-pos
pnpm add dayjs
```
