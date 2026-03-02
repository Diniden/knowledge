# Skill Template

Use this template when creating a new Cursor skill. Create a directory under `.cursor/skills/{skill-name}/` containing a `SKILL.md` file with the structure below.

---

```markdown
# {Skill Name}

> {One-line description of what this skill does}

## When to Use

{Describe the scenarios where this skill should be invoked. Be specific about triggers.}

- {Scenario 1}
- {Scenario 2}

## Prerequisites

{What must be true before this skill can run. Include required files, state, or knowledge.}

- {Prerequisite 1}
- {Prerequisite 2}

## Steps

{Numbered steps using Cursor tools. Each step should produce a concrete artifact.}

1. **{Step title}** — {Brief description}:
```

{Tool}: {how to use it}

```

2. **{Step title}** — {Brief description}:
```

{Tool}: {how to use it}

````

{Code example if helpful}:

```{language}
// example code showing the expected output
````

3. **{Step title}** — Verify:
   ```
   Shell: {test command}
   ```

## Validation

{Checklist of things that must be true when the skill completes.}

- [ ] {Validation item 1}
- [ ] {Validation item 2}
- [ ] {Validation item 3}

## Common Issues

{Table of known problems and their fixes.}

| Problem   | Resolution |
| --------- | ---------- |
| {Issue 1} | {Fix 1}    |
| {Issue 2} | {Fix 2}    |

## References

{Links to related rules and skills.}

- `.cursor/rules/{rule}.mdc` — {what it covers}
- `.cursor/skills/{skill}/SKILL.md` — {related skill}

```

---

## Conventions for Skills

1. **Tool references**: Use Cursor tool names — Read, Write, Shell, Glob, Grep, StrReplace, TodoWrite, Delete
2. **Code examples**: Include realistic examples using project conventions (BEM, MobX decorators, NestJS patterns)
3. **Placeholders**: Use `{PascalCase}` for component/class names, `{kebab-case}` for file/directory names, `{camelCase}` for variables
4. **Steps produce artifacts**: Every step should create, modify, or verify something concrete
5. **End with verification**: The final step should always run tests or build
6. **Cross-reference rules**: Link to `.cursor/rules/*.mdc` files that govern the output

## Checklist for New Skills

- [ ] Skill directory created: `.cursor/skills/{skill-name}/SKILL.md`
- [ ] All sections filled in (When to Use, Prerequisites, Steps, Validation, Common Issues, References)
- [ ] Steps use Cursor tool names, not shell commands for file operations
- [ ] Code examples follow project conventions
- [ ] Validation checklist is comprehensive
- [ ] Common Issues table has at least 2 entries
- [ ] Skill added to `.cursor/skills/_README.md`
- [ ] Skill added to `CLAUDE.md` Skill Reference Index (if significant)
- [ ] Entry added to `docs/ai-dev/CHANGELOG.md`
```
