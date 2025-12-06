# Agent Guide - `wario-shared`

## 1. Identity & Purpose

`wario-shared` is the **Universal Backbone** of the monorepo.

- **Environment Agnostic**: Runs in Node.js (backend) and Browser (frontend).
- **Dependencies**: Zero heavy dependencies. No React, no NestJS. Pure TypeScript/Zod/date-fns.
- **Role**: Defines the "Language" of the domain (what is an Order? what is a Product?).

## 2. Technical Architecture

### Key Components

- **DTOs (`src/lib/dto`)**: Data Transfer Objects used in API requests/responses. e.g., `CreateOrderRequestV2Dto`.
- **Domain Objects (`src/lib/objects`)**: Rich classes/functions for business logic.
  - `WCPProduct`: The complex structure of a product with modifiers.
  - `WOrderInstance`: The order schema.
- **Utilities**: Formatting, Date calculations (`WDateUtils`), Number handling.

### Conventions

- **Validation**: Zod schemas are often co-located here to be used by both Backend (validation pipes) and Frontend (form resolvers).
- **No Side Effects**: Functions here should be pure.

## 3. Critical workflows

- **Cart Logic**: The logic for "Are these two pizzas identical?" (`WProductEquals`) lives here. This ensures the Frontend cart grouping matches the Backend's expectations.
