# Cursor Skills

Cursor skills are structured guides that help AI agents perform common development tasks consistently. Each skill lives in its own directory as a `SKILL.md` file.

## How Skills Work

When you ask Cursor to perform a task that matches a skill, it reads the `SKILL.md` file and follows the steps inside. Skills reference specific Cursor tools (`Read`, `Write`, `Shell`, `Glob`, `Grep`, `StrReplace`, `TodoWrite`) and project conventions defined in `.cursor/rules/`.

## Available Skills

| Skill               | Directory              | Description                                        |
| ------------------- | ---------------------- | -------------------------------------------------- |
| Create Component    | `create-component/`    | React component with BEM SCSS, props, tests        |
| Create Store        | `create-store/`        | MobX store with decorators, RootStore registration |
| Create API Endpoint | `create-api-endpoint/` | NestJS controller method, DTOs, service, tests     |
| Create Module       | `create-module/`       | New NestJS module with full structure              |
| Create Test         | `create-test/`         | Unit, integration, or E2E tests                    |
| Add Feature         | `add-feature/`         | Full vertical slice across all layers              |
| Debug               | `debug/`               | Systematic debugging workflow                      |
| Refactor            | `refactor/`            | Safe refactoring with test verification            |
| Update AI Config    | `update-ai-config/`    | Update Cursor rules, skills, CLAUDE.md             |
| Create Cursor Rule  | `create-cursor-rule/`  | Author a new `.cursor/rules/*.mdc` file            |

## Conventions

- Each skill directory contains exactly one `SKILL.md` file.
- Skills reference `.cursor/rules/*.mdc` files for project conventions but do not duplicate their content.
- Skills use Cursor-native tools (Read, Write, Shell, Glob, Grep, StrReplace, TodoWrite) rather than shell equivalents.
- Steps are numbered and actionable. Each step produces a concrete artifact.

## Creating New Skills

See `docs/ai-dev/templates/skill-template.md` for the template. New skills should follow the same format and be added to this index.
