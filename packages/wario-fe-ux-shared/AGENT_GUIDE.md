# Agent Guide - `wario-fe-ux-shared`

## 1. Identity & Purpose

`wario-fe-ux-shared` is the **Design System** for **Customer-Facing** apps.

- **Apps**: `wario-fe-order`, `wario-fe-menu`, `wario-fe-credit`, `wario-fe-faq`.
- **Goal**: Ensure Brand Consistency (Fonts, Colors, Spacing).

## 2. Technical Architecture

- **Theme**: Exports `themeOptions` for MUI `createTheme`.
- **Components**: Specialized UI bits like `ModifierOptionTooltip` that are specific to the customer experience (pretty pictures, simplified text).

## 3. Conventions

- **Styling**: This package defines the "Look and Feel". If you need to change the primary brand color, you change it here.
