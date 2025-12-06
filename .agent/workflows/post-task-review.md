---
description: Mandatory post-task review before notifying user of completion
---

# Post-Task Review Workflow

**Trigger**: Before calling `notify_user` with `BlockedOnUser: false` to indicate task completion.

## Checklist

### 1. Architect Self-Review

Adopt the "Code Reviewer and Technology Architect" persona. Ask yourself:

- [ ] **Edge cases**: Did I handle null/undefined, empty arrays, missing config?
- [ ] **Security**: Any exposed secrets, unsanitized inputs, or auth bypasses?
- [ ] **Architectural violations**: Did I violate patterns (e.g., use Redux, bypass OrderManager)?
- [ ] **Dead code**: Did I leave any unused imports, variables, or injected services?
- [ ] **Consistency**: Does my solution match existing patterns in the codebase?

If issues found, fix them before proceeding.

### 2. Remove Temporary Code

- [ ] Remove any debug logging (`console.log`, temporary `this.logger.info`)
- [ ] Remove any `isInitialized` flags that are never read
- [ ] Remove any injected services that are never used

### 3. Update Documentation

// turbo

1. Identify which packages were modified (check `git diff --name-only` or recall from session)

2. For each modified package, review its `AGENT_GUIDE.md`:
   - Did the architecture change? Update the guide.
   - Did I introduce new patterns? Document them.
   - Did I add critical files? List them.

3. If new patterns were introduced that apply globally, update:
   - `.agent/rules/conventions.md` (coding rules)
   - `.agent/rules/tech-stack.md` (new libraries/patterns)

### 4. Verify Build (if code changes)

// turbo

```bash
pnpm backend:build 2>&1 | tail -20
```

Only proceed to notify user if build passes.

## Example

After completing a refactor that introduced `MigrationFlagsService`:

1. ✅ Self-review: Checked for unused code, found `GoogleService.isInitialized` was unused, removed it
2. ✅ Removed debug logging
3. ✅ Updated `apps/wario-backend/AGENT_GUIDE.md` with new "Configuration Patterns" section
4. ✅ Build passes
5. ✅ Now safe to call `notify_user` with completion message
