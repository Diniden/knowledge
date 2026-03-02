# Safe Refactoring

> Restructure code while maintaining behavior, guided by tests and incremental verification.

## When to Use

- Renaming a symbol (function, class, type, file) used across multiple files
- Extracting shared logic into a utility or service
- Moving files to a different directory
- Simplifying complex functions or reducing duplication
- Improving type safety or replacing `any` with proper types

## Prerequisites

- Existing tests pass before starting (`bun test`)
- You understand the current behavior of the code being refactored
- The refactoring goal is clear (rename, extract, move, simplify)

## Steps

1. **Establish a green baseline** — Use Shell to confirm all tests pass:

   ```
   Shell: bun test
   ```

   Do not proceed if tests are failing.

2. **Find all references** — Use Grep to locate every usage of the symbol or pattern:

   ```
   Grep: pattern="{symbolName}" output_mode="files_with_matches"
   Grep: pattern="import.*{symbolName}" output_mode="content"
   ```

   Use TodoWrite to track each file that needs updating.

3. **Read the affected files** — Use Read to understand context around each usage:

   ```
   Read: {each-file-from-step-2}
   ```

4. **Plan the changes** — Determine the order of operations:
   - For renames: update definition first, then all imports and usages
   - For extractions: create the new module, then replace inline code with imports
   - For moves: create at new location, update imports, delete old file

5. **Apply changes incrementally** — Use StrReplace for each file:
   - Make one logical change at a time
   - For bulk renames across a file, use `replace_all: true`
   - For file moves, use Write for the new file, then Delete for the old one
   - Update barrel files (`index.ts`) to reflect new exports

6. **Verify after each step** — Use Shell to run tests frequently:

   ```
   Shell: bun test {affected-workspace}
   ```

7. **Update imports** — Use Grep to verify no stale imports remain:

   ```
   Grep: pattern="{old-name-or-path}" output_mode="files_with_matches"
   ```

   Fix any remaining references.

8. **Final verification** — Use Shell to run the full suite:
   ```
   Shell: bun test
   Shell: bun run lint
   Shell: bun run build
   ```

## Validation

- [ ] All tests pass after refactoring (same count or more)
- [ ] No stale imports or references to old names/paths
- [ ] `bun run lint` passes
- [ ] `bun run build` succeeds
- [ ] No behavior changes (unless intentional and tested)
- [ ] Barrel files updated if exports changed

## Common Issues

| Problem                        | Resolution                                                       |
| ------------------------------ | ---------------------------------------------------------------- |
| Circular dependency after move | Reorganize imports or extract shared types to a neutral location |
| Test still imports old path    | Use Grep to find all import statements referencing the old path  |
| Build fails after rename       | Check for `.js` extension in imports — must match new filename   |
| Type errors after extraction   | Ensure the extracted module exports all needed types             |
| Barrel file out of date        | Regenerate or manually update `index.ts` re-exports              |

## References

- `.cursor/rules/general.mdc` — File organization and naming
- `.cursor/rules/project-structure.mdc` — Import rules and workspace boundaries
