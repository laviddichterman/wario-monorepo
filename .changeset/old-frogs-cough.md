---
'@wcp/wario-shared': patch
---

Added seating layout entities and repositories to wario-backend.

**New Entities:**

- `SeatingFloorEntity` - Restaurant floors
- `SeatingSectionEntity` - Sections within floors
- `SeatingPlacementEntity` - Table positions on canvas
- `SeatingLayoutEntity` - Layout aggregate
- Updated `SeatingResourceEntity` to match `SeatingResourceDto`

**Documentation:**

- Added JSDoc comments to seating DTOs in wario-shared
- Updated `DTO_GUIDE.md` with detailed field tables for all seating DTOs
- Updated `AGENT_GUIDE.md` with new entity and repository listings
