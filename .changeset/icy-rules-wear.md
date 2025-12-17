---
'@wcp/wario-backend': patch
---

Restructured backend directory for layered architecture:

- **Phase 1**: Extracted order domain services from `config/` to `domain/order/` (OrderManagerService, OrderValidationService, etc.)
- **Phase 2**: Consolidated database layer - moved Mongoose schemas to `infrastructure/database/mongoose/` and TypeORM entities to `infrastructure/database/typeorm/`
- **Phase 3**: Moved infrastructure services - `socket-io/` to `infrastructure/messaging/` and `printer/` to `infrastructure/printing/`
- **Runtime fixes**: Added missing seating Mongoose schemas (SeatingFloor, SeatingSection, SeatingPlacement, SeatingLayout, SeatingResource) and registered them in SettingsModule
