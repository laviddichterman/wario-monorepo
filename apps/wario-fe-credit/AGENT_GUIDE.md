# Agent Guide - `wario-fe-credit`

## 1. Identity & Purpose

`wario-fe-credit` is a dedicated flow for **Purchasing Store Credit** (Gift Cards).

- **Isolation**: Separated from the main ordering flow to simplify the checkout experience (no "mixed cart" complexity).

## 2. Technical Architecture

### Core Framework

- **React 19**: Vite-powered SPA.
- **Payment**: **Square Web SDK**. This is the critical piece. It must securely tokenize cards and submit to the backend.

### State Management

- **Form State**: `react-hook-form` + `zod` schema validation found in `src/components/`.
- **Mutation**: Submits to a specific endpoint (likely `/api/v1/credit/purchase` or similar) via `axiosInstance`.

### Directory Structure

- `src/components/WStoreCreditPurchase.tsx`: The wizard/form for buying credit.

## 3. Critical Workflows

1.  **Selection**: User chooses amount (preset or custom).
2.  **Recipient**: User enters email of recipient (self or other).
3.  **Payment**: Square iframe handles sensitive data.
4.  **Submission**: Backend processes payment via Square API and generates a Store Credit code.

## 4. Gotchas

- > [!IMPORTANT]
  > **Security**: Never touch the Square Payment Form logic unless you are certified/confident. Breaking this prevents revenue.
