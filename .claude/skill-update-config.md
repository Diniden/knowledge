# Skill: Update AI Development Configuration

> Safely modify development-time AI configuration files (CLAUDE.md, cursor rules, skills, scripts).

This is a **meta-skill** — it governs changes to the very configuration files that instruct AI assistants (including the file you are reading right now).

## When to Use

- Updating `CLAUDE.md`, `.claude/`, or `.cursor/rules/` files
- Adding or modifying AI skill files in `skills/` or `.cursor/skills/`
- Changing scripts in `scripts/ai-dev/`
- Updating documentation in `docs/ai-dev/`

## Prerequisites

- You understand the **development-time vs application-runtime boundary** (see `BOUNDARY.md`)
- You know which AI tool the config targets: Claude Code (`CLAUDE.md`, `.claude/`, `skills/`) or Cursor (`.cursor/`)

## Inputs

| Input               | Example                                                          | Required |
| ------------------- | ---------------------------------------------------------------- | -------- |
| `targetFile`        | `CLAUDE.md`, `skills/skill-debug.md`, `.cursor/rules/server.mdc` | Yes      |
| `changeDescription` | What is being changed and why                                    | Yes      |

## Steps

### 1. Identify affected config files

Map the change to specific files:

| Change Type          | Files                                        |
| -------------------- | -------------------------------------------- |
| Project context      | `CLAUDE.md`                                  |
| Claude Code settings | `.claude/settings.json`, `.claude/commands/` |
| Claude Code skills   | `skills/*.md`                                |
| Cursor rules         | `.cursor/rules/*.mdc`                        |
| Cursor skills        | `.cursor/skills/*/SKILL.md`                  |
| AI dev scripts       | `scripts/ai-dev/`                            |
| AI dev docs          | `docs/ai-dev/`                               |

### 2. Read current state

Read the target file(s) completely before making changes. Understand:

- What the file currently says
- How it relates to other config files
- What references it (other files that `@import` or link to it)

### 3. Verify boundary compliance

**Critical check**: Does this change stay within development-time configuration?

Confirm that you are NOT modifying any of these runtime files:

- `server/src/modules/agent/prompts/`
- `server/src/modules/agent/skills/`
- `server/agents/`
- `knowledge-graph/` (runtime data)

If the change would affect runtime agent behavior, **stop** and reconsider. Dev config changes should only affect how developers use AI tools to build the project.

### 4. Make the minimum necessary change

- Edit only what needs to change
- Preserve existing structure and formatting conventions
- Keep the same level of detail as surrounding content
- If adding a new section, follow the existing section pattern

### 5. Update cross-references

If the change affects how other files reference this one:

- Update `CLAUDE.md` Skill Reference Index if a skill was added/removed/renamed
- Update `skills/INDEX.md` if a skill was added/removed/renamed
- Update `.cursor/skills/` counterparts if a Claude Code skill changed
- Update `docs/ai-dev/` if documentation references changed

### 6. Validate

Run any available validation scripts:

```bash
# Check that CLAUDE.md is valid markdown
# Check that all referenced skill files exist
# Check that no runtime files were modified
```

If `scripts/ai-dev/validate.ts` exists, run it:

```bash
bun scripts/ai-dev/validate.ts
```

## Validation

1. **File is valid**: markdown renders correctly, no broken links
2. **Boundary respected**: no runtime agent files were modified
3. **Cross-references updated**: all references to the changed file are current
4. **Consistent style**: new content matches existing formatting and level of detail
5. **Validation scripts pass**: if available, `scripts/ai-dev/validate.ts` exits cleanly

## Common Issues

| Problem                                                   | Resolution                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Accidentally modified a runtime agent file                | Revert the change. Runtime files are governed by a different process                    |
| Skill Reference Index out of sync with actual skill files | Audit both `CLAUDE.md` and `skills/INDEX.md` to match what exists on disk               |
| Cursor rule not applying to expected files                | Check the glob pattern in the `.mdc` file's frontmatter matches the target file paths   |
| Skill file too long / too detailed                        | Keep skills concise. Move detailed reference material to `docs/ai-dev/` and link to it  |
| Config change conflicts with existing rule                | Read all related config files to understand existing constraints before adding new ones |
