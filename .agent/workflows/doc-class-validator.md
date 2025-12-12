---
description: Write (or stub) documentation for a class validator-ed class
---

## Documentation Workflow (Shared Type Library)

1. **Frame the task**: Capture a one-line problem statement, the primary consumer (backend validator, frontend form resolver, analytics), and the success metric (e.g., “Docs exist for all DTOs touched in PR #123; unknowns flagged; no broken links”).
2. **Inventory the surfaces**: List every affected artifact before writing:
   - Types/DTOs (`src/lib/types.ts`, `src/lib/dto/*`), domain objects (`src/lib/objects/*`), schemas (`src/lib/zod/*`), utilities, and any cross-package exports.
   - Note relationships (e.g., `IProductInstance` → `IProductInstanceDto` → `CreateOrderRequestV2Dto`).
3. **Lay down the skeleton** (per type/module) before filling details:
   - Overview: what it represents and where it is used.
   - Signature/shape: type alias/class name, required vs optional fields, default values.
   - Params/fields table: name, type, required?, allowed values/ranges, units, examples.
   - Behavior: validation rules, serialization notes (class-transformer/zod), versioning/compatibility, breaking-change risks.
   - Consumers: known callers (services, DTOs, frontend forms).
   - States: empty/loading/error/dirty where applicable.
   - Examples: happy path + edge case.
4. **Leave explicit stubs where unsure** so gaps are obvious:
   - `TODO: Confirm <method|field> behavior — not obvious from src/lib/objects/<file>.ts`
   - `??? Param <name> — clarify valid values/fallback (checked <file>:<line>, still unclear)`
   - `TODO @owner 2024-05-20: Document error handling for <call>`
   - Always log what you checked (file + line, ticket, PR) next to the stub.
5. **Research pass**: Read source/types/tests, run quick examples if needed, and resolve stubs. If unknowns remain, keep the stub and add the trace of what you inspected.
6. **Quality gate**: Verify every changed/added type has: overview, field table, behaviors, examples, consumer notes, and either resolved info or a stub. Check links, anchors, and code fences.
7. **Handoff**: Summarize completed coverage + remaining stubs (with owners/dates). Note any risky areas (breaking changes, serialization/validation differences between browser/node). Ship alongside the PR that introduced the type changes.
