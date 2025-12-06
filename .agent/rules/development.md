# Development Workflow

## Workspace Management

We use `pnpm` workspaces.

### Running Applications

Most apps have a `dev` script or similar. Use `pnpm output <script_name>` to run from root, or `cd` into the directory.

```bash
# Start the Backend
pnpm output backend:start:dev

# Start the POS
pnpm output pos:dev

# Start the Ordering App
pnpm output order:dev
```

### Testing

#### Unit Tests (Jest)

Located alongside source files (`*.spec.ts`).

```bash
pnpm output backend:test
```

#### E2E Tests (Playwright)

Located in root `e2e/`.

```bash
# Run all E2E tests (Mocked mode)
pnpm e2e

# Run integration tests (Live backend)
pnpm e2e:integration

# Debug mode
pnpm e2e --debug
```

## Adding Dependencies

Always use `pnpm add` at the package level.

```bash
cd apps/wario-pos
pnpm add dayjs
```
