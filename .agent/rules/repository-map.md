---
trigger: always_on
---

# Repository Map

This document provides a high-level visual overview of the `wario-monorepo`. Each package has a detailed `AGENT_GUIDE.md` linked below.

## Directory Tree

```
wario-monorepo/
├── apps/                               # Deployable Applications
│   ├── wario-backend/AGENT_GUIDE.md    # NestJS API, Business Logic, DB Access
│   ├── wario-pos/AGENT_GUIDE.md        # Staff Point of Sale (React, Jotai, Heavy UI)
│   ├── wario-fe-order/AGENT_GUIDE.md   # Customer Online Ordering (React, Zustand Cart)
│   ├── wario-fe-menu/AGENT_GUIDE.md    # Read-only Menu Viewer
│   ├── wario-fe-credit/AGENT_GUIDE.md  # Store Credit Purchase Flow
│   └── wario-fe-faq/AGENT_GUIDE.md     # Static FAQ Sites
│
├── packages/                           # Shared Libraries
│   ├── wario-shared/AGENT_GUIDE.md     # Universal Types, DTOs, Domain Logic (No UI)
│   ├── wario-ux-shared/AGENT_GUIDE.md  # UI Components (MUI), Query Hooks
│   └── wario-fe-ux-shared/AGENT_GUIDE.md  # Consumer facing UI Components & Theming (MUI). Things shared between various wario-fe* packages.
│
├── .agent/                             # AI Agent Configuration
│   ├── rules/                          # Mandatory rules & guides (YOU ARE HERE)
│   └── workflows/                      # Common task workflows (e.g., e2e-testing.md)
│
└── README.md                           # Entry point
```

## Quick Navigation

| Project      | Type         | Tech   | State Mgmt    | Key File                                           |
| :----------- | :----------- | :----- | :------------ | :------------------------------------------------- |
| **Backend**  | API          | NestJS | N/A           | `apps/wario-backend/src/app.module.ts`             |
| **POS**      | Staff App    | React  | Jotai/Query   | `apps/wario-pos/src/routes/sections/dashboard.tsx` |
| **Order FE** | Customer App | React  | Zustand/Query | `apps/wario-fe-order/src/stores/useCartStore.ts`   |
| **Shared**   | Lib          | TS     | N/A           | `packages/wario-shared/src/lib/types.ts`           |

## Package Links

- [/apps/wario-backend/AGENT_GUIDE.md](/apps/wario-backend/AGENT_GUIDE.md)
- [/apps/wario-pos/AGENT_GUIDE.md](/apps/wario-pos/AGENT_GUIDE.md)
- [/apps/wario-fe-order/AGENT_GUIDE.md](/apps/wario-fe-order/AGENT_GUIDE.md)
- [/apps/wario-fe-menu/AGENT_GUIDE.md](/apps/wario-fe-menu/AGENT_GUIDE.md)
- [/apps/wario-fe-credit/AGENT_GUIDE.md](/apps/wario-fe-credit/AGENT_GUIDE.md)
- [/apps/wario-fe-faq/AGENT_GUIDE.md](/apps/wario-fe-faq/AGENT_GUIDE.md)
- [/packages/wario-shared/AGENT_GUIDE.md](/packages/wario-shared/AGENT_GUIDE.md)
- [/packages/wario-ux-shared/AGENT_GUIDE.md](/packages/wario-ux-shared/AGENT_GUIDE.md)
- [/packages/wario-fe-ux-shared/AGENT_GUIDE.md](/packages/wario-fe-ux-shared/AGENT_GUIDE.md)
