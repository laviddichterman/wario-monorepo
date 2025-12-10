# Catalog Component Redesign Plan

This document outlines a holistic approach to redesigning the `wario-pos` catalog management components to align with the new [UX Design Guidelines](UX_Design.md).

## UX Strategy Overview

- **Move from Modals to Drawers**: Complex forms like **Product** and **Modifier Type** editing are currently constrained in centered modals. They should move to side drawers (right-aligned) to utilize vertical space better and allow reference to the underlying table.
- **Standardize Input Layouts**: Use consistent grid spacing (12px mobile / 24px desktop). Group related fields (e.g., Price & Tax, Identity & Codes) into clearly demarcated cards or sections with headers.
- **Visual Hierarchy**: Demote "Advanced" or "Technical" fields (like External IDs, Ordinals) to collapsed sections or secondary tabs. Highlight "Identity" and "Pricing" as primary information.
- **Action Clarity**: Ensure "Save" and "Cancel" buttons are always visible (sticky footer in drawers).

---

## 1. Product Editor (`ProductComponent`)

### General Tab

![Product Edit - General](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/product_edit_general_1765320898653.png)

### Configuration Tab (Scrolled)

![Product Edit - Configuration](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/product_edit_configuration_1765320921321.png)

### Modifiers Tab

![Product Edit - Modifiers](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/product_edit_modifiers_1765320933021.png)

### Data Structure

- **State**: `ProductFormState` (Jotai Atom)
- **Key Fields**:
  - `Identity`: Name, Description, Price, Singular Noun.
  - `Configuration`: Flavor/Bake Max, Fulfillment Flags, Timing, Availability.
  - `Modifiers`: List of `IProductModifier` (links to Modifier Types).
  - `Categorization`: Parent Categories (`CreateCategoryDto[]`), Printer Group.

### Current UX Issues

- **Dense Clustering**: "Categories", "Printer Group", "Price", and "Singular Noun" are packed together without clear hierarchy.
- **Hidden Complexity**: Critical configuration for kitchen display (Suggestion/Warning functions) is buried in a generic "Configuration" tab which is very long and requires scrolling.
- **Tab Overload**: "Modifiers" are a separate tab, but they are the heart of a product definition.

### Recommendations

- **Pattern**: **Right-Side Drawer (Double Wide)**.
- **Layout**:
  - **Header**: Product Name (Editable H1), Status Badge (Active/Archived).
  - **Left Column (Main Info)**:
    - Identity Card: Name, Price, Description.
    - Categorization Card: Category Select (Tree View?), Printer Group.
    - Modifiers Card: List of attached modifier types with quick "Add" inline.
  - **Right Column (Configuration)**:
    - Availability Card: Time/Day rules.
    - Kitchen Logic Card: Bake/Flavor max, Output station routing.
    - Ordering Rules Card: "Suggestion Functions" (renamed to "Upsells"?) and "Warning Functions".
- **Visuals**: Use `Card` components with `variant="outlined"` to group these sections.

---

## 2. Product Instance Editor (`ProductInstanceComponent`)

### Identity Tab

![Instance Edit - Identity](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/product_instance_edit_identity_1765320963840.png)

### Display Tab

![Instance Edit - Display](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/product_instance_edit_display_1765320976457.png)

### Modifiers Tab

![Instance Edit - Modifiers](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/product_instance_edit_modifiers_1765320983190.png)

_Included within Product Editor or standalone._

### Data Structure

- **State**: `ProductInstanceFormState`
- **Key Fields**: `DisplayName`, `PosName`, `Modifiers` (overrides).
- **Note**: No price configuration exists on instances; they inherit parent price.

### Recommendations

- **Pattern**: **Nested Card / Accordion**.
- **Improvement**: The current "Matrix" view of availability and modifiers is powerful but overwhelming.
- **Change**: Instead of a full tab set (Identity/Display/Modifiers), use a **vertical stepper** or **collapsible sections** so the user sees the flow: "Identity -> Overrides -> Modifiers".
- **Display Logic**: The "Display" tab separates Menu vs Order App vs POS visibility. This dense matrix of toggles should be simplified into channel-specific "Visibility Cards" (e.g., "Online Ordering Settings", "POS Settings").

---

## 3. Category Editor (`CategoryComponent`)

### Display Tab

![Category Edit - Display](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/category_edit_display_1765321168186.png)

### Data Structure

- **State**: `CategoryFormState`
- **Key Fields**: `Name`, `Parent` (Tree Ref), `Ordinal`, `ServiceDisable` (Fulfillment Flags), `Display` (HTML Description).

### Recommendations

- **Pattern**: **Standard Modal** (Simple enough for modal, but could be Drawer for consistency).
- **Layout**:
  - **Identity**: Name and Parent Category should be full-width.
  - **Fulfillment**: "Disabled Services" is a negative configuration. Invert this UI? "Available Services" with checkboxes is usually more intuitive.
  - **Display**: The HTML-allowed fields (Description, Subheading, Footnotes) take up massive vertical space. Put them in a "Content" accordion or use a rich-text input that expands on focus.

---

## 4. Modifier Type Editor (`ModifierTypeComponent`)

### Rules Tab

![Modifier Type Edit - Rules](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/modifier_type_edit_rules_1765321032214.png)

### Formatting Tab

![Modifier Type Edit - Formatting](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/modifier_type_edit_formatting_1765321045478.png)

### Data Structure

- **State**: `ModifierTypeFormState`
- **Key Fields**: `Name`, `Min/Max Selected`, `DisplayAs` (List, Radio, etc.), `Rules` (Omit if empty).

### Recommendations

- **Pattern**: **Right-Side Drawer**.
- **Critical Fix**: The "Min/Max Selected" integers are abstract.
  - **Visual**: Replace with a **"Selection Logic"** visual selector.
    - [ Icon: Single ] "Required (Choose 1)" (Min 1, Max 1)
    - [ Icon: Optional ] "Optional (Choose 0-1)" (Min 0, Max 1)
    - [ Icon: Multiple ] "Multiple (Choose up to N)"
- **Options List**: The list of associated options (e.g., "Pepperoni", "Sausage") is not currently in the edit dialog; it's on a detail row expansion in the main table. This separation is awkward. The options list should be the **primary content** of the edit drawer, allowing users to reorder and edit options in context.

---

## 5. Modifier Option Editor (`ModifierOptionComponent`)

### Rules Tab

![Option Edit - Rules](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/modifier_option_edit_rules_1765321088897.png)

### Configuration Tab

![Option Edit - Config](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/modifier_option_edit_config_1765321095698.png)

### Availability Tab

![Option Edit - Availability](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/modifier_option_edit_availability_1765321102516.png)

### Data Structure

- **State**: `ModifierOptionFormState`
- **Key Fields**: `DisplayName`, `Price`, `Operational Rules` (Potency, Bake Factor).

### Recommendations

- **Pattern**: **Panel / Popover** (if editing from Modifier Type list).
- **Pricing**: "Price" is slightly buried. It should be prominent in the Identity header.
- **Operational Rules**: "Flavor Factor", "Bake Factor" are highly technical kitchen operations data. Group them into a "Kitchen Impact" collapsed section so menu managers don't get confused by "Bake Factor".
- **Complex Forms**: Tabs for "Rules" and "Config" have many toggle switches. Group these by function (Ordering Rules vs Kitchen Rules) rather than generic "Config".

---

## 6. Printer Group Editor (`PrinterGroupComponent`)

### Identity Tab

![Printer Group Edit - Identity](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/printer_group_edit_identity_1765321186687.png)

### Configuration Tab

![Printer Group Edit - Config](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/printer_group_edit_config_1765321193670.png)

### Data Structure

- **State**: `PrinterGroupFormState`
- **Key Fields**: `Name`, `IsExpo` (Boolean), `SingleItemPerTicket` (Boolean).

### Recommendations

- **Pattern**: **Small Modal**.
- **Layout**: This is a simple entity.
  - **Identity**: Name.
  - **Behavior**: Convert "Single Item Per Ticket" and "Is Expo" into a **"Routing Behavior"** segment control or clear switch list. Use distinct icons for "Expo" vs "Kitchen" stations.
- **Tabs**: Remove tabs. 3 fields do not justify 2 tabs. Combine into a single form.

---

## 7. Product Function Editor (`ProductInstanceFunctionComponent`)

### Identity Tab

![Function Edit - Identity](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/product_function_edit_identity_1765321212239.png)

### Logic Tab

![Function Edit - Logic](/Users/lavid/.gemini/antigravity/brain/cd8d948f-5d46-4b28-8ec1-5567aa55437d/product_function_edit_logic_1765321219206.png)

### Data Structure

- **State**: `ProductInstanceFunctionFormState`
- **Key Fields**: `FunctionName`, `Expression` (Logic definition).

### Recommendations

- **Pattern**: **Code Editor Modal**.
- **Expression Editor**: The `AbstractExpressionFunctionalContainer` presents a raw text area.
- **Context**: Provide a sidebar of "Available variables" (e.g., `Product.Price`, `Order.Total`) so the user knows what they can reference in the function expression.
- **Tabs**: Remove tabs. "Identity" is just the name. The logic is the main thing. Show Name at the top and the logic editor below it.

---

## Visual Polish & Input Standards

To achieve the "Premium Design" and correct information density requested:

### 1. Toggle Switches (`ToggleBooleanPropertyComponent`)

- **Current**: Default label placement "top" centers the switch, creating a jagged vertical rhythm in forms.
- **Correction**: Enforce `labelPlacement="end"` or `"start"` consistently.
  - **Settings/Flags**: `labelPlacement="end"` (Switch | Label) for standard lists.
  - **Dense Grids**: `labelPlacement="start"` (Label | Switch) for right-aligned status panels.
- **Styling**: Use the **iOS-style switch** (larger track, smooth knob) via styled component overrides to feel more touch-friendly and modern.

### 2. Text Inputs (`StringPropertyComponent`)

- **Current**: Uses default Material input properties.
- **Correction**:
  - **Variant**: Standardize on `variant="outlined"`.
  - **Density**: Use `size="small"` for all data-entry forms to reduce "air" and allow more fields above the fold.
  - **Helper Text**: Always reserve space for helper text or validation errors to prevent layout jank on error.

### 3. Numeric Inputs (`IntNumericPropertyComponent`)

- **Current**: Standard text field with number parsing.
- **Correction**: Implement **Stepper Controls** (`[-] Input [+]`) for frequent small-integer fields like "Ordinal", "Min Selected", and "Max Selected". This reduces typing for common `+1/-1` adjustments.

---

## Feature Spotlight: Code Autocomplete

**Problem**: The `ProductInstanceFunction` logic editor is currently a **nested set of abstract expression builders**. While structured, this approach is clunky, occupies excessive screen real estate, and is difficult to parse mentally compared to a clean code view.

**Solution**: Replace the nested builders with a localized code editor (e.g., **Monaco Editor** or **CodeMirror**) configured for the specific domain language to allow power users to write logic faster.

### Implementation Plan

1.  **Library**: Integrate `@monaco-editor/react`. **Crucial**: Utilize lazy loading (`React.lazy` or dynamic imports) to avoid bloating the main bundle size.
2.  **Language Definition**: Register a custom language `wario-logic`.
3.  **Completion Provider**:
    - **Variables**: Auto-suggest `Product`, `Order`, `Customer` objects.
    - **Properties**: Introspect the TypeScript interfaces (DTOs) to strictly type suggestions (e.g., typing `Product.` suggests `.Price`, `.Id`).
4.  **Validation**: Use a simple parser or validator to highlight syntax errors in real-time (red squiggles) before submission.
