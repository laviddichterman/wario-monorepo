---
'@wcp/wario-shared': minor
'@wcp/wario-backend': patch
'@wcp/wario-pos': patch
'@wcp/wario-fe-order': patch
'@wcp/wario-fe-credit': patch
---

Updated Seating Upsert DTOs to correctly support nested object creation in a single request. Adjusted `CreateSeatingLayoutRequestDto` and related DTOs to use `UpdateXxxItem` union types, matching the runtime validation behavior. Also includes dependency updates and documentation improvements.
