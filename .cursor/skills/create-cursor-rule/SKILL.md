# Create Cursor Rule

> Author a new `.cursor/rules/*.mdc` file to codify project conventions for AI-assisted development.

## When to Use

- Establishing conventions for a new area of the codebase
- Codifying patterns that AI agents should follow consistently
- Adding file-type-specific or directory-specific guidance
- Preventing recurring mistakes in AI-generated code

## Prerequisites

- You know the domain the rule covers (frontend, server, testing, etc.)
- You have specific conventions or patterns to enforce
- The rule doesn't duplicate an existing one — check first

## Steps

1. **Check existing rules** — Use Glob and Read to survey what's already defined:

   ```
   Glob: .cursor/rules/*.mdc
   ```

   Read each relevant rule to avoid duplication.

2. **Choose the rule scope** — Determine whether the rule should:
   - Apply always (`alwaysApply: true`) — for universal project conventions
   - Apply to specific files (`alwaysApply: false` with `globs`) — for domain-specific patterns
   - Be manually invoked (`alwaysApply: false`, no `globs`) — for optional guidance

3. **Choose a descriptive filename** — Use kebab-case: `{domain}-{topic}.mdc`
   Examples: `frontend-forms.mdc`, `server-auth.mdc`, `testing-fixtures.mdc`

4. **Write the rule file** — Use Write to create `.cursor/rules/{name}.mdc`:

   ````markdown
   ---
   description: { One-line description of what this rule covers }
   globs:
     - '{glob-pattern-1}'
     - '{glob-pattern-2}'
   alwaysApply: false
   ---

   # {Rule Title}

   ## {Section}

   - Convention 1
   - Convention 2

   ## Example

   ```{language}
   // Correct usage
   ```
   ````

   ## Anti-patterns

   ```{language}
   // WRONG: explanation of what not to do
   ```

   ```

   ```

5. **Include concrete examples** — Every rule should have:
   - At least one "correct" code example
   - At least one "incorrect" / anti-pattern example
   - Brief explanation of _why_ for each convention

6. **Update cross-references** — Use StrReplace to add the rule to `CLAUDE.md` if it represents a significant convention. Use StrReplace to update `.cursor/skills/_README.md` if it relates to a skill.

7. **Validate the globs** — Use Glob to verify the pattern matches intended files:
   ```
   Glob: {your-glob-pattern}
   ```
   Ensure it doesn't match files outside the intended scope.

## Validation

- [ ] Frontmatter has `description`, `globs` (if scoped), and `alwaysApply`
- [ ] Rule has concrete code examples (correct and incorrect)
- [ ] Glob pattern matches intended files and nothing else
- [ ] No overlap with existing rules
- [ ] Cross-references updated (CLAUDE.md if significant)
- [ ] File uses `.mdc` extension

## Common Issues

| Problem             | Resolution                                                                |
| ------------------- | ------------------------------------------------------------------------- |
| Rule not triggering | Verify `globs` pattern matches the file being edited; check `alwaysApply` |
| Rule too broad      | Narrow the `globs` or split into domain-specific rules                    |
| Conflicting rules   | Merge overlapping rules or add priority notes                             |
| Rule too verbose    | Keep rules actionable; link to external docs for background               |

## References

- `.cursor/rules/general.mdc` — Example of an `alwaysApply: true` rule
- `.cursor/rules/frontend-components.mdc` — Example of a scoped rule
- `.cursor/rules/server.mdc` — Example of a workspace-scoped rule
