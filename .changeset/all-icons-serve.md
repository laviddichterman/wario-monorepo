---
'@wcp/wario-backend': patch
'@wcp/wario-pos': patch
'@wcp/wario-shared': patch
---

- **@wcp/wario-pos**: Improved product editing workflow by consolidating product and instance updates into a single transaction. Added dirty state tracking for product instances to prevent data loss.
- **@wcp/wario-backend**: Fixed regression in catalog sync where hidden product instances were incorrectly flagged for updates. Updated logic to strictly check for `MODIFIER_WHOLE` IDs.
- **@wcp/wario-shared**: Relaxed validation on product instance descriptions.
- **Global**: Updated lint and typecheck configuration to include E2E tests (`e2e` directory) in root scripts. Updated `e2e` configuration for compatibility.
