---
'@wcp/wario-shared': minor
---

The package provides multiple entry points to avoid bundling unnecessary dependencies:

| Entry Point                 | Contents            | ESM Size                 | Use Case                                     |
| --------------------------- | ------------------- | ------------------------ | -------------------------------------------- |
| `@wcp/wario-shared`         | Everything          | 6KB + 238KB chunk        | Backend (needs DTOs with class-validator)    |
| `@wcp/wario-shared/logic`   | Types + utilities   | **2.87KB** + 118KB chunk | Frontend (needs functions like `WDateUtils`) |
| `@wcp/wario-shared/types`   | Interfaces + enums  | **561 bytes**            | Type-only imports                            |
| `@wcp/wario-shared/testing` | Mock data factories | 48KB                     | Tests                                        |

### Choosing the Right Entry Point

```typescript
// ✅ Type-only imports (smallest, no runtime code)
import type { IProduct, ICategory } from '@wcp/wario-shared/types';
import { FulfillmentType, DISABLE_REASON } from '@wcp/wario-shared/types';

// ✅ Types + utility functions (no class-validator/class-transformer)
import { WDateUtils, MoneyToDisplayString, WProductEquals } from '@wcp/wario-shared/logic';
import type { ICatalogSelectors } from '@wcp/wario-shared/logic';

// ✅ Backend DTOs with decorators (only in wario-backend)
import { CreateOrderRequestV2Dto, UpdateIProductRequestDto } from '@wcp/wario-shared';
```

> **Important**: Never import decorated DTO classes in frontend code. They pull in `class-validator` and `class-transformer` (~50KB+).
