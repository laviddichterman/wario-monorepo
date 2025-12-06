# Tech Stack & Architecture

This guide describes the core technologies used across `wario-monorepo`.

## The "Trinity" of State Management

We use three distinct libraries for state management. **Do not mix these up.**

| Scope            | Library            | Role                                                                   | Example                                 |
| :--------------- | :----------------- | :--------------------------------------------------------------------- | :-------------------------------------- |
| **Server State** | **TanStack Query** | fetching/caching/synchronizing API data. The SOURCE OF TRUTH.          | `useOrdersQuery`, `useCatalogSelectors` |
| **Global State** | **Zustand**        | App-wide singletons, session data, or complex multi-step wizards.      | `useCartStore`, `useUserStore`          |
| **Atomic State** | **Jotai**          | Fine-grained, high-frequency UI state shared between a few components. | `dialogueStateAtom`, `productFormAtom`  |

> [!WARNING]
> **Redux is Banned**. If you see Redux code, it is legacy. Do not write new Redux code.

## Frontend

- **Framework**: React 19
- **Build Tool**: Vite
- **UI Library**: Material UI (MUI) v5/v6
- **Styling**: Emotion (`@emotion/styled`). **Avoid CSS modules and Tailwind** (unless explicitly requested).
- **Forms**: `react-hook-form` + `zod` resolvers.

## Backend

- **Framework**: NestJS
- **Database**: MongoDB via `mongoose` schema definitions.
- **Communication**:
  - HTTP (REST) for standard CRUD.
  - Socket.IO for real-time events (`order:created`).
- **Logging**: `nestjs-pino`. **Never use `console.log`**.
- **Auth**: Passport + Auth0 (JWT).

## Shared Architecture

- **`wario-shared`**: Pure TypeScript. Contains the DTOs and Logic that both Frontend and Backend share.
  - _Example_: Use `WProductEquals` (from shared) to compare products on both FE (cart deduping) and BE (order validation).
