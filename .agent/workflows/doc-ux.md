---
description: Write documentation for UX code
---

## Documentation Workflow

- Scope first: add a one-line problem statement and primary users (e.g., “Kitchen lead editing menu availability during rush; needs safe, fast updates”) plus a success metric (time-to-complete or error rate).
- Inventory what to document: components (AppBar/Drawer/DataGrid/Dialog), flows (Filter → Inspect → Edit → Save), states (empty/loading/error/dirty), tokens (palette/spacing/typography/radius/focus).
- Lay a skeleton before details:
  - Overview: what it is, where it’s used.
  - Props/parameters: name, type, required?, defaults, expected range.
  - Behavior: loading/error/empty/success/dirty; accessibility; keyboard; responsive notes (laptop/tablet/mobile); theming hooks (tokens, density toggle).
  - Examples: happy path + edge case; known limitations.
- When unsure, leave explicit stubs near the uncertainty so gaps are obvious:
  - `TODO: Confirm what triggers <method>`
  - `??? Param <name> — clarify valid values and fallback behavior`
  - `TODO: Document error handling for <call>`
  - Add owner/date if helpful (`TODO @owner 2024-05-20`).
- Research pass: read code/UX specs, run the flow, and resolve stubs. If still unknown, keep the stub and note what you checked (file + line or ticket link) for traceability.
- Validate against guardrails: AA contrast, visible focus rings, token usage (no hardcoded HEX), primary action clarity, compact/comfortable density toggle, mobile filters/confirms reachable.
- Handoff checklist: title/breadcrumb/env badge present; primary action surfaced; filters discoverable; DataGrid columns defined with min widths and density/export/selection documented; drawer/dialog confirm flows noted; empty/loading/error states described; shortcuts captured (`/` to focus search, `?` for shortcuts help).
- Final pass: stubs remain only where truly unknown; mark as “Needs product/eng confirmation” with owner + date.
