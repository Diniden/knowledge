# AI-Assisted Development Onboarding

Get productive with AI-assisted development on the Knowledge Graph Agent System in under 30 minutes.

## Quick Start

### 1. Install Your AI Tool

Choose one or both:

- **Cursor** — Download from [cursor.com](https://cursor.com). Works as a VS Code replacement with built-in AI agent.
- **Claude Code** — Install via `npm install -g @anthropic-ai/claude-code`. Runs in the terminal alongside any editor.

### 2. Clone and Setup

```bash
git clone <repo-url> knowledge
cd knowledge
bun install
bun run setup
```

### 3. Configs Auto-Load

When you open the project, AI configuration loads automatically:

| Tool        | Config Source               | What It Does                                              |
| ----------- | --------------------------- | --------------------------------------------------------- |
| Cursor      | `.cursor/rules/*.mdc`       | Contextual coding rules that activate based on file globs |
| Cursor      | `.cursor/skills/*/SKILL.md` | Step-by-step guides for common tasks                      |
| Claude Code | `CLAUDE.md`                 | Master context file with full project conventions         |
| Claude Code | `.claude/`                  | Claude Code-specific settings                             |

No manual configuration needed. Open the project and start working.

## Understanding the Config System

### CLAUDE.md

The master context file for Claude Code. Contains the full tech stack, coding standards, project structure, workflow commands, and skill reference index. Claude Code reads this automatically when you start a session in the project root.

### .cursor/rules/

Cursor rule files (`.mdc` format) provide contextual guidance. Each rule has:

- **`alwaysApply: true`** rules load for every file (e.g., `general.mdc`)
- **Glob-scoped** rules load only when editing matching files (e.g., `frontend-components.mdc` loads for `client/**/*.tsx`)

Current rules:

| Rule                      | Scope                     | Description                                           |
| ------------------------- | ------------------------- | ----------------------------------------------------- |
| `general.mdc`             | All `.ts`/`.tsx`          | TypeScript, file organization, naming, error handling |
| `frontend.mdc`            | `client/**`               | React, MobX, BEM SCSS overview                        |
| `frontend-components.mdc` | `client/**/components/**` | Component file structure and patterns                 |
| `frontend-styling.mdc`    | `client/**/*.scss`        | BEM SCSS naming, nesting, theming                     |
| `frontend-state.mdc`      | `client/**/stores/**`     | MobX decorators, RootStore, actions                   |
| `frontend-services.mdc`   | `client/**/services/**`   | API client service patterns                           |
| `frontend-hooks.mdc`      | `client/**/hooks/**`      | Custom React hook conventions                         |
| `server.mdc`              | `server/**`               | NestJS modules, controllers, services                 |
| `project-structure.mdc`   | All                       | Workspace layout, import rules                        |
| `git-workflow.mdc`        | All                       | Branch naming, commits, PRs                           |

### .cursor/skills/

Step-by-step guides for common development tasks. Cursor reads these when a task matches. See `.cursor/skills/_README.md` for the full list.

### .claude/

Claude Code-specific configuration. Settings, custom commands, and project-level preferences that supplement `CLAUDE.md`.

## Setup by Tool

### Cursor Only

1. Open the `knowledge/` directory in Cursor
2. Rules and skills load automatically
3. Try: "Create a new React component called StatusBadge in components/"
4. Cursor will follow the `create-component` skill

### Claude Code Only

1. Navigate to `knowledge/` in your terminal
2. Run `claude` to start a session
3. Claude Code reads `CLAUDE.md` automatically
4. Try: "Create a new React component called StatusBadge in components/"
5. Claude Code will follow the skill referenced in `CLAUDE.md`

### Both Tools Together

Using both tools is recommended for complex tasks:

- **Cursor** for interactive editing, inline completions, and component work
- **Claude Code** for multi-file refactors, large features, and terminal-heavy tasks

Both tools read from the same conventions. They will produce consistent code regardless of which tool you use.

## Try a Simple Task

### Create a Component (5 minutes)

Ask your AI tool:

> "Create a new shared React component called StatusBadge that displays a colored badge based on a status prop. Put it in client/ui/src/components/."

The AI should:

1. Create `StatusBadge/` directory with four files
2. Follow BEM SCSS naming
3. Export a typed props interface
4. Include a basic test

### Create a Store (5 minutes)

> "Create a new MobX domain store called TagStore for managing tags. It should have a list of tags and a loadTags action."

The AI should:

1. Create the store with explicit MobX decorators
2. Register it in RootStore
3. Include a co-located test

## Troubleshooting

| Issue                             | Fix                                                                      |
| --------------------------------- | ------------------------------------------------------------------------ |
| Cursor rules not loading          | Ensure you opened the `knowledge/` root directory, not a subdirectory    |
| Claude Code not reading CLAUDE.md | Run `claude` from the project root where `CLAUDE.md` lives               |
| AI generates inconsistent code    | Verify rules are loading — check `.cursor/rules/` matches your file path |
| Skill not followed                | Explicitly reference the skill: "Follow the create-component skill"      |

## Next Steps

- Read `docs/ai-dev/agent-types/README.md` to understand agent delegation for large tasks
- Browse `.cursor/skills/_README.md` for all available skills
- Check `docs/ai-dev/CHANGELOG.md` for recent config changes
