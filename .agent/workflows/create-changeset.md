---
description: Create a properly formatted changeset for the current changes
---

# Create Changeset Workflow

**Use this workflow** when you have finished a task and are ready to document your changes for the release process. This is typically done after the `/post-task-review` is complete and changes are staged.

## 1. Generate Empty Changeset

// turbo

Run the interactive command to create a blank changeset file (we use `--empty` to avoid the interactive UI limitations).

```bash
pnpm changeset --empty
```

## 2. Locate and Open

Find the newly created file in the `.changeset/` directory. It will have a random name like `calm-lions-dance.md`.

## 3. Populate Dependencies

Edit the YAML frontmatter (between the `---` lines) to list the packages you modified and the type of version bump required.

**SemVer Rules:**

- **patch**: Bug fixes, perf improvements, small tweaks (No API changes).
- **minor**: New features, backwards-compatible API changes.
- **major**: Breaking API changes.

**Example Frontmatter:**

```yaml
---
'@wcp/wario-pos': patch
'@wcp/wario-shared': minor
---
```

> [!TIP]
> If you are unsure which packages to include, check `git diff --name-only` to see where your changes live.

## 4. Write Description

Write a clear, human-readable summary of your changes in the body. This text will end up in the changelog.

**Good Description:**
"Refactored `ProductEditContainer` to use `useUpdateProductInstanceMutation` for better concurrency handling."

**Bad Description:**
"Fixed bug."

## 5. Verify

Ensure the file is saved and looks correct.

**Full Example File Content:**

```markdown
---
'@wcp/wario-backend': patch
---

Fixed an issue where the database migration would hang on startup if the `flags` collection was empty.
```
