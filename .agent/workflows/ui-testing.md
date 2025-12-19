---
description: How to manually test UI changes like a human user would
---

# UI Testing Workflow

This workflow ensures UI changes are tested through natural human-like interactions, not programmatic JavaScript execution. All testing should simulate real user behavior.

## Core Principles

> [!IMPORTANT]
> **Never use JavaScript console commands to test UI functionality.** Real users interact through clicks, typing, scrolling, and navigation—not `document.querySelector()` or React DevTools.

1. **Simulate Real Users**: Test by clicking buttons, typing in inputs, and navigating as a human would
2. **Record Natural Flow**: Document whether interactions feel intuitive and responsive
3. **Visual Verification**: Confirm visual state changes through screenshots, not DOM inspection
4. **Accessibility First**: Test keyboard navigation and focus states

## Pre-Testing Setup

1. Start the relevant development server:

```bash
# For POS app
pnpm pos:dev

# For Order app
pnpm order:dev

# For Menu app
pnpm menu:dev
```

2. Wait for the dev server to be fully ready before testing

## Testing Procedure

### Step 1: Navigate to Feature

Use the browser subagent to navigate to the page containing the UI change:

```
Task: Navigate to [URL] and confirm the page has fully loaded.
Return: Screenshot of the loaded page and confirmation of any loading states.
```

### Step 2: Identify Interactive Elements

Before testing, visually identify:

- Buttons and clickable elements
- Form inputs and controls
- Navigation items
- Modals/dialogs that may appear
- Drag-and-drop zones (if applicable)

### Step 3: Test Core Interactions

For each interaction type, test as a human would:

#### Click Interactions

- **Single click**: Does the element respond visually (hover state, pressed state)?
- **Click feedback**: Is there immediate visual feedback?
- **Loading states**: Do spinners/skeletons appear when expected?

#### Form Interactions

- **Type naturally**: Enter text character by character, not paste entire strings
- **Tab navigation**: Can users navigate between fields with Tab key?
- **Validation feedback**: Do error messages appear at appropriate times?
- **Submit behavior**: Does form submission show appropriate loading/success states?

#### Navigation Interactions

- **Link behavior**: Do links navigate to expected destinations?
- **Back button**: Does browser back button work correctly?
- **Deep linking**: Can users bookmark and return to specific states?

#### Drag-and-Drop (if applicable)

- **Initiation**: Does drag start on mousedown/touchstart?
- **Visual feedback**: Is there a drag preview or shadow?
- **Drop zones**: Are valid drop targets clearly indicated?
- **Cancellation**: Can users cancel by pressing Escape?

### Step 4: Test Edge Cases

- **Rapid clicks**: Does double-clicking cause issues?
- **Empty states**: What happens with no data?
- **Long content**: Does text overflow correctly?
- **Responsive behavior**: Does the UI adapt to different viewport sizes?

### Step 5: Verify Visual States

Capture screenshots at key moments:

1. **Initial state**: Before any interaction
2. **Hover state**: When hovering over interactive elements
3. **Active/pressed state**: During click/touch
4. **Loading state**: During async operations
5. **Success state**: After successful actions
6. **Error state**: When errors occur
7. **Final state**: After completing the flow

## Recording Findings

### Use Browser Subagent for Testing

When using the browser subagent, structure tasks clearly:

```markdown
Task: Test the [feature name] by performing the following human interactions:

1. Navigate to [URL]
2. Click on [element description]
3. Type "[text]" into [input description]
4. Click [submit button]
5. Wait for and observe the result

For each step, report:

- Whether the interaction succeeded
- Any visual feedback received
- Whether the interaction felt natural
- Any delays or unexpected behaviors

Capture screenshots before and after key interactions.
Do NOT use JavaScript console commands—only simulate real user clicks and typing.
```

### Naturalness Checklist

Document your findings using this format:

| Interaction           | Natural? | Notes         |
| --------------------- | -------- | ------------- |
| Button click response | ✅/❌    | [Observation] |
| Form field focus      | ✅/❌    | [Observation] |
| Loading feedback      | ✅/❌    | [Observation] |
| Error message clarity | ✅/❌    | [Observation] |
| Animation smoothness  | ✅/❌    | [Observation] |

### Red Flags to Watch For

- **Dead zones**: Clickable-looking elements that don't respond
- **Missing feedback**: Actions that complete silently
- **Unexpected scrolling**: Page jumping during interactions
- **Focus traps**: Inability to tab out of elements
- **Phantom clicks**: Elements that trigger unintended actions
- **Layout shifts**: Content moving unexpectedly during loading
- **Misaligned elements**: Items that don't line up with their neighbors
- **Inconsistent spacing**: Uneven gaps between similar elements
- **Clipped content**: Text or icons cut off by container boundaries

### Visual Alignment & Awkwardness Checks

Look for elements that appear visually "off" or unprofessional:

| Issue                        | What to Look For                                             |
| ---------------------------- | ------------------------------------------------------------ |
| **Misaligned text**          | Labels not vertically centered with inputs, uneven baselines |
| **Unbalanced padding**       | More space on one side than the other                        |
| **Orphaned elements**        | Single items floating without visual connection to others    |
| **Cramped layouts**          | Elements too close together, no breathing room               |
| **Stretched/squished icons** | Icons not maintaining aspect ratio                           |
| **Jagged edges**             | Elements that almost align but are off by a few pixels       |
| **Inconsistent sizing**      | Similar buttons/cards with different dimensions              |
| **Broken grid**              | Elements that don't follow the established layout grid       |
| **Awkward wrapping**         | Text or elements wrapping at unexpected breakpoints          |
| **Z-index issues**           | Elements overlapping incorrectly or appearing behind others  |

#### Quick Visual Scan Questions

Ask yourself:

1. Do all the edges line up? (left edges, right edges, tops, bottoms)
2. Is the spacing consistent between repeating elements?
3. Does anything look "off" at first glance?
4. Would this pass a design review?
5. Does the layout break at different viewport widths?

#### Documenting Visual Issues

When reporting visual awkwardness:

```markdown
**Issue**: [Brief description]
**Location**: [Page/component name]
**Screenshot**: [Attach annotated screenshot with arrows pointing to issue]
**Expected**: [What it should look like]
**Severity**: Minor/Moderate/Major (based on visual impact)
```

## Example Test Session

```markdown
# UI Test: SeatingBuilderView Table Drag-and-Drop

## Test Environment

- App: wario-pos
- URL: http://localhost:5173/dashboard/seating
- Browser: Chrome (via browser subagent)

## Tests Performed

### 1. Adding a Table

- Clicked "Add Table" button
- **Result**: ✅ Table appeared on canvas
- **Naturalness**: ✅ Immediate visual feedback

### 2. Dragging a Table

- Clicked and held on table
- Dragged to new position
- Released mouse button
- **Result**: ✅ Table moved to new location
- **Naturalness**: ❌ No drag preview during move

### 3. Editing Table Properties

- Double-clicked on table
- **Result**: ✅ Properties panel opened
- Typed new table name
- **Naturalness**: ✅ Input focused automatically

## Summary

- 3 interactions tested
- 2 fully natural
- 1 issue found: Missing drag preview
```

## After Testing

1. Document all findings in a walkthrough or issue
2. Attach relevant screenshots as evidence
3. Prioritize fixes based on naturalness impact
4. Re-test after fixes are applied
