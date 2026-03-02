# Skill: Safe Refactoring

> Perform structural code changes incrementally with test verification at each step.

## When to Use

- Renaming modules, functions, types, or files
- Extracting shared logic into a utility or service
- Restructuring directory layout
- Splitting large files or merging small ones
- Changing API signatures across consumers

## Prerequisites

- `bun install` has been run in the workspace root
- All existing tests pass (this is your safety baseline): `bun test`
- No uncommitted changes (clean git state preferred)

## Inputs

| Input           | Example                                    | Required |
| --------------- | ------------------------------------------ | -------- |
| `scope`         | What is being refactored and why           | Yes      |
| `affectedFiles` | List of files/directories that will change | Yes      |

## Steps

### 1. Establish baseline

Run the full test suite and confirm everything passes:

```bash
bun test
bun run lint
bun run build
```

If anything fails, fix it first. Do NOT begin refactoring on a failing codebase.

### 2. Identify all consumers

Find every file that imports, references, or depends on the code being changed:

```bash
rg "import.*{symbolName}" --type ts
rg "{symbolName}" --type ts --type tsx
```

Build a complete list of affected files before making changes. Check across all workspaces:

- `client/ui/src/`
- `server/src/`
- `shared/src/`
- `packages/`

### 3. Plan the change sequence

Order changes to minimize breakage:

1. **Shared types first** — if the interface changes, update `shared/` first
2. **Leaf consumers last** — update files that depend on others after their dependencies
3. **Tests alongside source** — update the test when you update the source file

For renames, consider this order:

1. Create the new name (add, don't remove yet)
2. Update all consumers to use the new name
3. Remove the old name
4. Verify

### 4. Make incremental changes

Apply changes **one file or one logical unit at a time**. After each change:

```bash
bun test
```

If a test fails, fix it immediately before moving to the next file. Do NOT batch all changes and test at the end.

### 5. Update imports

When renaming files or moving modules:

- Update all `import` statements to reflect new paths
- Use `.js` extensions in all relative imports (ESM)
- Update barrel files (`index.ts`) that re-export the moved module
- Update `tsconfig.json` path mappings if affected

### 6. Update shared types

If the refactor changes types in `shared/`:

- Update the type definition in `shared/src/`
- Check `shared/src/index.ts` barrel export
- Update server consumers
- Update client consumers
- Run `bun run build` to catch type errors across workspaces

### 7. Update tests

For each changed source file:

- Update test imports to match new file paths
- Update test assertions if behavior changed
- Rename test `describe` blocks to match new names
- Add new tests if the refactor introduced new code paths

### 8. Final verification

Run the complete validation suite:

```bash
bun test          # All tests pass
bun run lint      # No lint errors
bun run build     # Full build succeeds
```

### 9. Review the diff

Before committing, review the total diff:

```bash
git diff --stat
git diff
```

Verify:

- No unintended changes
- No leftover old names or dead code
- No debug artifacts
- Import ordering follows project conventions

## Validation

1. **All tests pass**: `bun test` exits cleanly
2. **No lint errors**: `bun run lint` reports no new errors
3. **Build succeeds**: `bun run build` completes across all workspaces
4. **No dead code**: old names/files are fully removed
5. **Imports clean**: no broken or circular imports introduced
6. **Diff is coherent**: changes are logically grouped and minimal

## Common Issues

| Problem                                      | Resolution                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| Circular import after moving a module        | Extract the shared dependency into a third file that both can import         |
| Type error in workspace that wasn't touched  | Shared type changed — rebuild `shared/` first: `cd shared && bun run build`  |
| Test imports break after file move           | Update test file imports and check that the test runner finds the new paths  |
| Barrel file re-exports stale path            | Update `index.ts` to point to the new file location with `.js` extension     |
| Rename missed in string literals or comments | Search for the old name in all file types (not just `.ts`): `rg "{oldName}"` |
