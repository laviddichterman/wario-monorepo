---
'@wcp/wario-pos': patch
---

Refactor CRUD containers and config components (KV Store, Lead Times, Block Off, Settings) to use TanStack Query mutations instead of manual `fetch` calls. Created `useConfigMutations` and `useConfigQueries` hooks.
