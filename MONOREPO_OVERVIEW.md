# Monorepo Overview

## Introduction

The `wario-monorepo` is a comprehensive codebase for a pizza restaurant platform. It contains the backend API, Point-of-Sale (POS) system for staff, and multiple frontend applications for customers (ordering, menu, credit).

## Workspace Structure

### Apps (`apps/`)

- **[wario-backend](file:///Users/lavid/Documents/wario-monorepo/apps/wario-backend/AGENT_GUIDE.md):** Main NestJS API handling orders, users, and catalog.
- **[wario-pos](file:///Users/lavid/Documents/wario-monorepo/apps/wario-pos/AGENT_GUIDE.md):** React/Vite app for store staff (Point of Sale).
- **[wario-fe-order](file:///Users/lavid/Documents/wario-monorepo/apps/wario-fe-order/AGENT_GUIDE.md):** React/Vite app for customer online ordering.
- **[wario-fe-menu](file:///Users/lavid/Documents/wario-monorepo/apps/wario-fe-menu/AGENT_GUIDE.md):** React/Vite app for viewing the menu.
- **[wario-fe-credit](file:///Users/lavid/Documents/wario-monorepo/apps/wario-fe-credit/AGENT_GUIDE.md):** React/Vite app for purchasing store credit.
- **[wario-fe-faq](file:///Users/lavid/Documents/wario-monorepo/apps/wario-fe-faq/AGENT_GUIDE.md):** React/Vite app for FAQs.

### Packages (`packages/`)

- **[wario-shared](file:///Users/lavid/Documents/wario-monorepo/packages/wario-shared/AGENT_GUIDE.md):** Universal TypeScript logic (DTOs, types), no UI dependencies.
- **[wario-ux-shared](file:///Users/lavid/Documents/wario-monorepo/packages/wario-ux-shared/AGENT_GUIDE.md):** Shared UI for internal tools (POS).
- **[wario-fe-ux-shared](file:///Users/lavid/Documents/wario-monorepo/packages/wario-fe-ux-shared/AGENT_GUIDE.md):** Shared UI for customer-facing apps.

## Key Technologies

- **Backend:** NestJS, Mongoose, Socket.IO, Pino.
- **Frontend:** React 19, Vite, Material UI, Emotion.
- **State Management (The Trinity):**
  - **Server:** TanStack Query (Primary Source of Truth).
  - **Global/Singleton:** Zustand (Stores for app-wide settings or complex wizards like Order Builder).
  - **Component/Shared:** Jotai (Atoms for UI state and cross-component signaling).

## Deployment

- **Frontend:** Built via Vite, deployed via `rsync` to WordPress host.
- **Backend:** Dockerized (implied).

## Conventions Summary

- **Strict TypeScript:** No `any`.
- **Validation:** `zod` for frontend forms, `class-validator` for backend DTOs.
- **State:** Use the right tool for the job (Zustand vs Jotai vs Query).
