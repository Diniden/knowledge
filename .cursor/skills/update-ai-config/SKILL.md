# Update AI Development Config

> Safely modify Cursor rules, skills, CLAUDE.md, and other AI dev configuration files.

## When to Use

- Adding or updating a Cursor rule in `.cursor/rules/`
- Adding or updating a Cursor skill in `.cursor/skills/`
- Modifying `CLAUDE.md` (master Claude Code context)
- Updating `.claude/` configuration
- Changing scripts in `scripts/ai-dev/`

## Prerequisites

- You understand the dev vs. runtime boundary (see `BOUNDARY.md`)
- The change is to **development-time** AI config, NOT runtime agent files
- You know which config file(s) need updating

## Steps

1. **Verify the boundary** — Confirm you are NOT editing runtime files:
   - SAFE: `.cursor/`, `.claude/`, `CLAUDE.md`, `scripts/ai-dev/`, `docs/ai-dev/`
   - FORBIDDEN: `server/src/modules/agent/prompts/`, `server/src/modules/agent/skills/`, `server/agents/`

2. **Read the current config** — Use Read to understand what exists:

   ```
   Read: {config-file-to-update}
   ```

   For rules, also check:

   ```
   Glob: .cursor/rules/*.mdc
   ```

3. **Make the change** — Use StrReplace for modifications to existing files, or Write for new files:
   - For `.mdc` rules: include frontmatter with `description`, `globs`, and `alwaysApply`
   - For skills: follow the SKILL.md template format
   - For `CLAUDE.md`: maintain the existing section structure

4. **Update cross-references** — If the change affects other config files:
   - Check if `CLAUDE.md` references the changed file (Skill Reference Index section)
   - Check if `.cursor/skills/_README.md` needs updating
   - Use Grep to find any references:
     ```
     Grep: pattern="{filename}" path=".cursor/"
     Grep: pattern="{filename}" path="CLAUDE.md"
     ```

5. **Update the changelog** — Use StrReplace to add an entry to `docs/ai-dev/CHANGELOG.md`:

   ```
   ## YYYY-MM-DD
   - [{file}] {Description} ({reason})
   ```

6. **Validate** — Use Shell to run any validation scripts:
   ```
   Shell: bun run lint
   ```

## Validation

- [ ] No runtime agent files were modified
- [ ] Config file has correct format (frontmatter for `.mdc`, markdown for skills)
- [ ] Cross-references updated (CLAUDE.md, \_README.md)
- [ ] Changelog entry added
- [ ] No duplicate or conflicting rules

## Common Issues

| Problem                            | Resolution                                                      |
| ---------------------------------- | --------------------------------------------------------------- |
| Rule not loading in Cursor         | Check that the frontmatter `globs` pattern matches target files |
| Rule applying to wrong files       | Narrow the `globs` pattern or set `alwaysApply: false`          |
| Accidentally editing runtime files | Review the boundary: `server/src/modules/agent/` is FORBIDDEN   |
| Skill not appearing in suggestions | Ensure the skill is listed in `_README.md`                      |

## References

- `BOUNDARY.md` — Dev vs. runtime boundary reference
- `CLAUDE.md` — Master context file (Skill Reference Index section)
- `.cursor/skills/_README.md` — Skills index
- `docs/ai-dev/CHANGELOG.md` — Config change tracking
