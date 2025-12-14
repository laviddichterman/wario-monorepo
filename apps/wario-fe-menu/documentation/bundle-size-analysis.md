# wario-fe-menu Bundle Size Analysis

## Executive Summary

The current production bundle for `wario-fe-menu` is **2.75MB** (unminified), compressing to **~820KB gzipped**. For a read-only menu viewer, this is unnecessarily large. The primary culprit is **MUI X Data Grid Premium**, which alone contributes **1.03MB** (297KB gzipped) of Excel export functionality that's not needed.

---

## Build Output Analysis

```
dist/assets/exceljs.min-CkOLIwsL.js  1,035.39 kB │ gzip: 297.41 kB
dist/assets/index-C8JkqhSb.js        1,719.39 kB │ gzip: 522.31 kB
Total:                               2,754.78 kB │ gzip: 819.72 kB
```

---

## Major Dependencies

### Current Dependencies (package.json)

| Package                      | Size Impact           | Usage                         | Necessary?          |
| :--------------------------- | :-------------------- | :---------------------------- | :------------------ |
| **@mui/x-data-grid-premium** | **CRITICAL** (1.03MB) | Table display mode only       | ❌ **NO**           |
| @mui/material + @emotion     | High (~400-500KB)     | UI components throughout      | ✅ Yes              |
| @mui/icons-material          | Medium (~150-200KB)   | Single icon (ExpandMore)      | ⚠️ **Optimize**     |
| motion                       | Medium (~100-150KB)   | MotionLazy in App.tsx         | ⚠️ **Questionable** |
| @mui/lab                     | Low-Medium            | TabContext, TabList, TabPanel | ✅ Yes (core)       |
| @tanstack/react-query        | Low-Medium            | Data fetching/caching         | ✅ Yes              |
| date-fns                     | Low                   | Date formatting               | ✅ Yes (shared)     |
| zustand                      | Low                   | State management              | ⚠️ **Check usage**  |
| notistack                    | Low                   | Notifications                 | ⚠️ **Check usage**  |

---

## Detailed Findings

### 1. MUI X Data Grid Premium (CRITICAL ISSUE)

**File:** [WMenuTableComponent.tsx](file:///Users/lavid/Documents/wario-monorepo/apps/wario-fe-menu/src/components/WMenuTableComponent.tsx)

**Problem:**

- Imports `DataGridPremium` from `@mui/x-data-grid-premium`
- This pulls in the entire `exceljs` library (1.03MB) for Excel export functionality
- Excel export is **explicitly disabled** in the component:
  ```tsx
  slotProps={{
    toolbar: {
      excelOptions: { disableToolbarButton: true },  // ← Not needed!
      csvOptions: { disableToolbarButton: true },
      printOptions: { disableToolbarButton: true }
    }
  }}
  ```
- Only used for `CategoryDisplay.TABLE` mode (one of 4 display modes)

**Impact:** **37.5%** of total bundle size (1.03MB of 2.75MB)

**Recommendation:** Replace with a lightweight custom table or basic MUI Table component.

---

### 2. MUI Icons Material (MEDIUM PRIORITY)

**Usage:** Only **one icon** is used: `ExpandMore`

```tsx
// WMenuComponent.tsx, line 3
import ExpandMore from '@mui/icons-material/ExpandMore';
```

**Problem:** `@mui/icons-material` is a large package. Importing even one icon pulls significant overhead.

**Impact:** Estimated ~150-200KB

**Recommendation:**

- Use an inline SVG icon instead
- Or switch to a smaller icon library (e.g., `@phosphor-icons/react`, `lucide-react`)

---

### 3. Motion Library (LOW-MEDIUM PRIORITY)

**File:** [App.tsx](file:///Users/lavid/Documents/wario-monorepo/apps/wario-fe-menu/src/App.tsx#L9)

```tsx
import { MotionLazy } from '@wcp/wario-ux-shared/containers';
```

**Usage:** Only wraps the loading screen:

```tsx
<MotionLazy>
  <LoadingScreen />
</MotionLazy>
```

**Problem:** The `motion` library (formerly Framer Motion) is ~100-150KB just for a loading animation.

**Impact:** ~100-150KB

**Recommendation:**

- Use CSS animations instead for the loading screen
- Or lazy-load the motion library only when needed

---

### 4. Unused Dependencies (LOW PRIORITY)

The following dependencies are declared but may not be actively used in the menu app:

- **zustand** - State management (menu viewer likely doesn't need complex state)
- **notistack** - Toast notifications (may not be needed for read-only viewer)
- **mailcheck** - Email validation (definitely not needed)

**Recommendation:** Audit and remove unused dependencies.

---

## Optimization Recommendations

### Priority 1: Replace DataGridPremium (CRITICAL)

**Estimated savings: ~1.03MB (297KB gzipped) — 37.5% reduction**

**Options:**

#### Option A: Use Basic MUI Table ✅ RECOMMENDED

- Lightweight, already have `@mui/material` as dependency
- Supports sorting, filtering via React state
- Example implementation:
  ```tsx
  import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
  ```

#### Option B: Downgrade to Free Data Grid

- Use `@mui/x-data-grid` (free version) instead of Premium
- Savings: ~700KB (exceljs removed, but still heavy)
- Keeps advanced features if needed

#### Option C: Custom Table Component

- Full control over features and bundle size
- Most work, but smallest result
- Use `@tanstack/react-table` (headless, tree-shakable)

---

### Priority 2: Optimize Icon Imports (MEDIUM)

**Estimated savings: ~150-200KB**

Replace the single MUI icon with an inline SVG:

```tsx
// Instead of:
import ExpandMore from '@mui/icons-material/ExpandMore';

// Use:
const ExpandMoreIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
  </svg>
);
```

Then remove `@mui/icons-material` from dependencies.

---

### Priority 3: Review Animation Library Usage (LOW-MEDIUM)

**Estimated savings: ~100-150KB**

Replace MotionLazy wrapper with simple CSS fade-in for loading screen:

```tsx
// Simple CSS alternative
<div className="fade-in">
  <LoadingScreen />
</div>
```

```css
.fade-in {
  animation: fadeIn 0.3s ease-in;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

---

### Priority 4: Remove Unused Dependencies (LOW)

**Estimated savings: ~50-100KB**

Audit and remove:

- `mailcheck` - Email validation (not needed for menu)
- `zustand` - Check if actually used
- `notistack` - Check if actually used

---

## Projected Results

| Optimization                                 | Current    | After       | Savings            |
| :------------------------------------------- | :--------- | :---------- | :----------------- |
| Replace DataGridPremium with MUI Table       | 2.75MB     | 1.72MB      | **-1.03MB (-37%)** |
| Inline SVG icon (remove @mui/icons-material) | 1.72MB     | 1.52MB      | **-200KB (-12%)**  |
| Remove motion wrapper (CSS animation)        | 1.52MB     | 1.37MB      | **-150KB (-10%)**  |
| Remove unused deps                           | 1.37MB     | 1.27MB      | **-100KB (-7%)**   |
| **TOTAL PROJECTED SAVINGS**                  | **2.75MB** | **~1.27MB** | **-1.48MB (-54%)** |

**Gzipped:** From ~820KB to ~380KB (**-53% reduction**)

---

## Next Steps

1. **Immediate:** Replace `WMenuTableComponent` to use basic MUI Table instead of DataGridPremium
2. **Quick win:** Inline the single ExpandMore icon SVG
3. **Follow-up:** Audit motion library usage and unused dependencies
4. **Verify:** Re-run bundle analysis to confirm savings

---

## Additional Notes

- The `@wcp/wario-ux-shared` and `@wcp/wario-fe-ux-shared` packages should also be audited for tree-shaking
- Consider enabling `build.rollupOptions.output.manualChunks` in Vite config to split vendor bundles
- The warning about `eval` in exceljs confirms it's a heavyweight library not suitable for production

---

## Verification

To view the bundle analysis visualization:

```bash
open apps/wario-fe-menu/dist/stats.html
```

To rebuild with analysis:

```bash
pnpm --filter @wcp/wario-fe-menu build
```
