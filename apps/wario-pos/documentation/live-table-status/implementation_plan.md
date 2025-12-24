# Live Table Status Map Feature

## Goal

Create a real-time view of the restaurant floor showing table occupancy and status, helping staff quickly identify tables needing attention.

## Design

### Status Color Coding

| Status              | Color         | Meaning                            |
| ------------------- | ------------- | ---------------------------------- |
| `PENDING`           | Gray          | No assignment yet                  |
| `ASSIGNED`          | Blue          | Table reserved, guests not arrived |
| `WAITING_ARRIVAL`   | Yellow        | Expecting guests soon              |
| `SEATED_WAITING`    | Orange        | Partial party seated               |
| `SEATED`            | Green         | Fully seated, needs service        |
| `WAITING_FOR_CHECK` | Purple        | Wrapping up, check requested       |
| `PAID`              | Teal          | Paid, table will be free soon      |
| `COMPLETED`         | Default/Empty | Table is free                      |

### Multi-Table Orders

When an order is assigned to multiple adjacent tables (e.g., Table 4 + Table 5 for a large party), both tables will:

- Show the same color based on the order's seating status
- Display a visual indicator (border/glow) showing they're linked
- Clicking either table opens the same order drawer

### Components

#### [NEW] `LiveTableStatusMap.tsx`

Main component wrapping `SeatingCanvas` in readonly mode with status overlays.

Props:

- `layoutId?: string` - Optional specific layout, defaults to first available
- `onTableClick?: (orderId: string | null, tableIds: string[]) => void` - Click handler

Features:

- Floor tabs (if multiple floors)
- Legend showing status colors
- Click table to open order drawer

#### [NEW] `useLiveTableStatus.ts`

Hook to compute current table status from live orders.

```typescript
interface TableStatusEntry {
  tableId: string;
  orderId: string | null;
  status: WSeatingStatus | null;
  linkedTableIds: string[]; // Other tables in same order
}

function useLiveTableStatus(): {
  tableStatusMap: Record<string, TableStatusEntry>;
  isLoading: boolean;
};
```

Implementation (stubbed):

1. Fetch all orders with status OPEN, CONFIRMED, PROCESSING for today
2. Filter to DineIn fulfillment type
3. Extract `fulfillment.dineInInfo.seating.tableId[]` and `status`
4. Build map of tableId -> order/status

#### [MODIFY] `SeatingCanvas.tsx`

Add optional `tableStatusMap` prop for status overlay rendering:

- When provided, render status colors on tables
- Add visual linking for multi-table orders

### Page Integration

- Modular component on **main app tab** (not a separate route)
- Click behavior differs from Order Management drawer:
  - **Occupied table**: Opens table-focused UI (future: add to order, not read-only view)
  - **Empty table**: Quick walk-in assignment flow

### Real-time Updates

Updates via RxDB or GraphQL subscription (transport layer detail, deferred).
For now, hook will use existing `useOrdersQuery` with appropriate filters.

## Task List

- [ ] Create `useLiveTableStatus` hook with stubbed order computation
- [ ] Modify `SeatingCanvas` to accept `tableStatusMap` for status coloring
- [ ] Create `LiveTableStatusMap` component
- [ ] Add legend component for status colors
- [ ] Add empty table click handler for walk-in flow
- [ ] Integrate into main app dashboard
