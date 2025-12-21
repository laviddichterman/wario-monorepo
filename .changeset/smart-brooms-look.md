---
'@wcp/wario-bridge': minor
'@wcp/wario-shared-private': minor
'@wcp/wario-pos': patch
'@wcp/wario-backend': patch
'@wcp/wario-shared': patch
---

Added new `wario-bridge` edge server application for restaurant device communication (printers, KDS tablets, POS clients) and `wario-shared-private` internal package for bridge message types. Fixed ESLint warnings in Seating Layout Builder by adding explicit return types to hooks, memoizing dependencies, and adding eslint-disable comments for array index access checks.
