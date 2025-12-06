# Agent Guide - `wario-fe-menu`

## 1. Identity & Purpose

`wario-fe-menu` is a **Read-Only Menu Viewer**.

- **Usage**: Embedded in the main website or used by customers who just want to browse without ordering.
- **Goal**: Display products, modifiers, and prices clearly. **NO** cart, **NO** checkout.

## 2. Technical Architecture

### Core Framework

- **React 19**: Vite-powered SPA.
- **Shared UX**: Uses `@wcp/wario-fe-ux-shared` for theming (fonts, colors).

### State Management

- **Server**: Uses `useSocketData` (from `@wcp/wario-ux-shared`) to ensure the menu is live-synced with the backend.
- **Local**: Minimal. Unlike `wario-fe-order`, it doesn't need a complex Cart Store. It likely reuses `useCustomizerStore` from `wario-fe-order` code _if_ it allows clicking items to see details, but based on dependencies, it might just display lists.

### Directory Structure

- `src/components/WMenuComponent.tsx`: Main entry point.
- `src/hooks/`: Data fetching hooks.

## 3. Critical Workflows

- **Loading**: Waits for `isSocketDataLoaded` (WebSocket connection to Backend) before rendering. This ensures it doesn't show a stale menu.
- **Rendering**: Iterates through Categories -> Products.

## 4. Developer Guide

```bash
pnpm output menu:dev
```

- **Maintenance**: This app is low-churn. Changes usually happen in `wario-backend` (data) or `wario-fe-ux-shared` (styles).
