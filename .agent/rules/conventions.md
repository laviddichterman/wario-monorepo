# Coding Conventions

## Critical Rules

### 1. No `console.log`

- **Backend**: Use `this.logger.info/error/warn` from `nestjs-pino`.
- **Frontend**: Use `console.error` ONLY for unrecoverable errors. Debug logs should be removed before commit.

### 2. Strict Types

- Do not use `any`. Use `unknown` if you must, then narrow.
- Fix type errors; do not suppress them with `@ts-ignore` unless absolutely necessary (and documented).

### 3. File Naming

- **React Components**: `PascalCase.tsx` (e.g., `ProductList.tsx`).
- **Hooks**: `camelCase.ts` (e.g., `useCart.ts`).
- **Utilities/Configs**: `kebab-case.ts` (e.g., `date-utils.ts`).

### 4. Artifact Placement

- **DTOs**: If a DTO is used by API, it belongs in `packages/wario-shared`.
- **Components**:
  - If specific to one app -> `apps/<app>/src/components`.
  - If internal tool generic -> `packages/wario-ux-shared`.
  - If customer facing generic -> `packages/wario-fe-ux-shared`.

## Patterns

### Error Handling

- **Backend**: Throw Domain Exceptions (e.g., `OrderNotFoundException`). Do not throw generic `HttpException`.
- **Frontend**: Wrap API calls in `handleAxiosError` or let TanStack Query's `onError` handle it.

### Validations

- **Frontend**: Schema validation with `zod`.
- **Backend**: Decorator validation with `class-validator`.

### 5. Documentation Maintenance

- **Update Guides**: At the end of every task, review the `AGENT_GUIDE.md` for the modified package(s). If architecture, conventions, or critical files have changed, update the guide immediately. The guides must remain the "Sole Source of Truth".

### 6. Architect Code Review

- **Mandatory Sub-Agent Review**: Before marking a task as complete or finalizing an implementation plan, and **BEFORE** updating any agent documentation, you MUST invoke a high-effort sub-agent.
    - **Persona**: The sub-agent should act as the "Code Reviewer and Technology Architect".
    - **Goal**: Poke holes in the plan/code, look for edge cases, security flaws, or architectural violations (e.g., Redux usage), and play "devil's advocate".
    - **Action**: Only proceed after addressing the Architect's concerns.
