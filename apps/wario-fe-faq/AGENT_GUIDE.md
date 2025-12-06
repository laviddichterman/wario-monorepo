# Agent Guide - `wario-fe-faq`

## 1. Identity & Purpose

`wario-fe-faq` is a static information viewer.

- **Goal**: Answer customer questions (Heating instructions, Delivery zones, etc.).

## 2. Technical Architecture

- **React 19**: Vite.
- **Simplicity**: No WebSocket requirements. It renders immediately (`WNestedInfoComponent`).

## 3. Developer Guide

- **Content Updates**: Check if content is hardcoded in `src/components` or fetched from a JSON file/CMS.
- **Styling**: Should match the main site via `@wcp/wario-fe-ux-shared`.
