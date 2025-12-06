# Agent Guide - `wario-fe-order`

## 1. Identity & Purpose

`wario-fe-order` is the **Customer Ordering Application**. It is the revenue-generating frontend where users serve themselves.

- **Experience**: Guided "Wizard" style flow (The Stepper).
- **Complexity**: High complexity in the **Product Customizer** (building pizzas with logic for halves, modifiers, nested options).
- **State**: Heavily relies on local session state (building the cart) before syncing to the server.

## 2. Technical Architecture

### Core Framework

- **React 19**: Vite-powered SPA.
- **Deployment**: Static assets deployed to simple web host (e.g., WordPress content directory via rsync).

### Directory Structure (`src/`)

- `components/`:
  - `step/`: The major stages of the wizard (`WFulfillmentStage`, `WShopForProducts`, `WCheckoutStage`).
  - `product-customizer/`: The complex UI for configuring items.
  - `WOrderingComponent.tsx`: The Main Orchestrator.
- `stores/`: **Zustand Stores** (The Brains).
  - `useCartStore.ts`: Tracks items the user intends to buy.
  - `useCustomizerStore.ts`: Tracks temporary state while editing an item.
  - `useStepperStore.ts`: Tracks progress through the wizard.
- `hooks/`: Business logic hooks (e.g. `useSubmitOrderMutation`).

### State Management Strategy

#### 1. The Cart Store (`useCartStore`)

**Technology**: `zustand`.
**Purpose**: Holds the _client-side_ representation of the order.

- **Key Actions**: `addToCart`, `removeFromCart`, `updateCartProduct`.
- **Persistence**: Likely minimal; session-based (reload might wipe it unless persisted via middleware, check code).
- **Conversion**: Maps to DTO via `selectCartAsDto` before sending to API.

#### 2. The Customizer Store (`useCustomizerStore`)

**Technology**: `zustand`.
**Purpose**: Ephemeral state for the "Modal" or "View" where a user configures a specific product.

- **Flow**: User clicks "Add Pizza" -> `customizeProduct` action called -> UI shows options -> User clicks "Done" -> `addToCart` called -> Customizer cleared.

#### 3. Mutation & Server Sync

**Technology**: `tanstack-query`.

- **File**: `src/hooks/useSubmitOrderMutation.ts`.
- **Endpoint**: `POST /api/v1/order`.
- **Error Handling**: Wraps Axios errors into user-friendly messages (`ResponseFailure`).

## 3. Critical Workflows

### The "Build a Pizza" Flow

1.  **Selection**: User selects a base product (e.g. "Create Your Own").
2.  **Customizer Init**: `useCustomizerStore.customizeProduct()` is called with a structured clone.
3.  **Optimization**: UI renders options based on `product.m.modifier_map`.
4.  **Completion**: On save, the modified `WProduct` object is pushed to `useCartStore`.
5.  **Deduplication**: `findDuplicateInCart` prevents adding identical items twice (increments qty instead).

### Checkout

1.  **Validation**: `DeliveryValidationForm` checks address.
2.  **Payment**: Square Web SDK tokenizes card.
3.  **Submit**: Payload constructed (`cart`, `customerInfo`, `fulfillment`, `paymentToken`).
4.  **Success**: Redirect/Scroll to confirmation.

## 4. Developer Guide

### Running Locally

```bash
# Start Vite server
pnpm output order:dev
```

**Note**: You will likely need a running `wario-backend` for the menu to load, unless you are using mocked data.

### Common Tasks

- **Adding a Step**:
  1.  Create component in `src/components/step/`.
  2.  Add to `STAGES` array in `WOrderingComponent.tsx`.
  3.  Update `useStepperStore` if new logic needed for transition.

## 5. Gotchas

- > [!WARNING]
  > **Product Structure**: Structurally cloning `WProduct` is common but expensive. Be careful with deep nested modifiers.
- > [!TIP]
  > **Zustand DevTools**: The stores are wired up to `devtools`. Use the Redux DevTools extension to debug cart state changes.
