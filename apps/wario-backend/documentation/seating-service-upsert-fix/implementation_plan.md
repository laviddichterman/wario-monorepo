# Implementation Plan - Fix Seating Service Upsert Logic

The `SeatingService` currently uses strict property existence checks (`'id' in f`) to distinguish between creation and update operations. This fails when the frontend sends new entities with an empty string ID (`id: ""`), causing them to be treated as updates to non-existent records and thus ignored.

This change aligns the service logic with the `api.dto.ts` validation logic, which treats empty IDs as creations.

## Proposed Changes

### 1. Update Upsert Logic in `SeatingService`

**File:** `apps/wario-backend/src/modules/seating/seating.service.ts`

Modify `syncFloors`, `syncSections`, and `syncResources` to strictly identify updates only when a **non-empty** ID is present.

**Current Logic:**

```typescript
const toCreate = incoming.filter((f) => !('id' in f));
const toUpdate = incoming.filter((f) => 'id' in f);
```

**New Logic:**

```typescript
const toCreate = incoming.filter((f) => !('id' in f) || f.id === '');
const toUpdate = incoming.filter((f) => 'id' in f && f.id !== '');
```

(Using appropriate type casting or property access to avoid TS errors)

## Verification

- **Build Verification**: Ensure backend builds successfully.
- **Manual Verification**: Since we don't have a backend E2E test suite in this context easily accessible for this logic, I will rely on the type correctness and the logic alignment with the previously verified DTOs.
