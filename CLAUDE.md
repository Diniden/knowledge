# Knowledge Graph Agent System

A collaborative knowledge management platform where humans author structured knowledge through AI-assisted dialog. Knowledge is organized into a graph of interconnected specs, powered by RAG retrieval and AI agents that consume the graph to produce step-by-step execution plans.

## Domain Boundary Warning

You are a **DEVELOPMENT** assistant. You help humans write code for this project.

**Development-time AI config** (this file, `.cursor/`, `.claude/`, `scripts/ai-dev/`, `docs/ai-dev/`):
Files that help developers build the project using AI tools.

**Application-runtime AI config** (`server/src/modules/agent/`, `server/agents/`):
Files the deployed application uses to drive its agent system for end users.

**Never modify runtime agent files** (`server/src/modules/agent/prompts/`, `server/src/modules/agent/skills/`, `server/agents/`) as part of dev-config work. Those are application runtime files governed by `06-AGENT-SYSTEM/`. See `BOUNDARY.md` for the full reference.

## Tech Stack

| Layer           | Technology                     | Notes                                                    |
| --------------- | ------------------------------ | -------------------------------------------------------- |
| Frontend        | React + Vite                   | Latest stable, TypeScript strict                         |
| State           | MobX                           | `makeObservable`, decorators, `enforceActions: 'always'` |
| Styling         | BEM SCSS                       | PascalCase blocks, `.module.scss` co-located             |
| Backend         | NestJS (ESM)                   | One module per domain, DI everywhere                     |
| Runtime         | Bun                            | Package manager, test runner, script executor            |
| Database        | PostgreSQL + pgvector          | Via Drizzle ORM                                          |
| Knowledge Store | JSON + folders                 | Git-backed in `knowledge-graph/`                         |
| Auth            | bcrypt + JWT                   | http-only cookies                                        |
| Rich Text       | TipTap                         | Spec editor content                                      |
| Virtual Lists   | @tanstack/virtual              | Lists with 50+ items                                     |
| Agent Runtime   | Claude Code CLI                | Wrapped via `packages/claude-code-wrapper/`              |
| Embeddings      | Local model (nomic-embed-text) | No external API required                                 |
| Testing         | bun:test                       | Unit/integration; Playwright for E2E                     |

### Library Preferences

- `date-fns` over `moment.js` — tree-shakeable, smaller bundle
- `zod` for runtime validation — TypeScript-native schemas
- `dnd-kit` over `react-beautiful-dnd` — actively maintained
- `execa` for process spawning — modern ESM-first API
- `@tanstack/virtual` over `react-virtuoso` — lighter, composable
- No `lodash` — use native JS; import specific utils from `@kg/shared` if needed
- No `axios` — use native `fetch` wrapped in service modules

## Coding Standards

### TypeScript

- `strict: true` in all `tsconfig.json`. No `any` — use `unknown` + type guards.
- No non-null assertions (`!`) unless accompanied by a comment explaining why.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- Exhaustive `switch` with `never` default for discriminated unions.
- Use `.js` extensions in relative imports (ESM resolution).
- Use `const` by default. Never use `var`.
- `noUncheckedIndexedAccess` enabled — always handle potentially undefined index access.

### Import Ordering

1. Node built-ins (`node:fs`, `node:path`)
2. Third-party packages (`react`, `mobx`, `@nestjs/*`)
3. Workspace packages (`@kg/shared`)
4. Project-relative imports (`../utils/`, `./components/`)
5. Sibling/local imports (`./types`, `./index`)

Each group separated by a blank line. Alphabetized within groups.

### File Naming

- Directories: `kebab-case` (`knowledge-graph/`, `auth-module/`)
- React components: `PascalCase.tsx` (`SpecEditor.tsx`)
- Stores: `PascalCase.store.ts` (`SpecEditor.store.ts`)
- Services: `kebab-case.service.ts` (`spec-editor.service.ts`)
- DTOs: `kebab-case.dto.ts` (`create-spec.dto.ts`)
- Types: `kebab-case.types.ts` (`knowledge-graph.types.ts`)
- Tests: `{source-file}.test.ts`, co-located with source
- SCSS: `ComponentName.module.scss`, co-located with component

### BEM SCSS

```scss
.SpecEditor {
  &__Header {
    font-size: 1.25rem;
  }
  &__Content {
    padding: 1rem;
  }
  &--expanded {
    max-height: none;
  }
}
```

Single-level nesting only — never `&__Item &__SubItem`. Use CSS custom properties for theming.

### MobX Stores

```typescript
import { makeObservable, observable, action, computed } from 'mobx';

export class SpecStore {
  @observable accessor specs: Spec[] = [];
  @observable accessor loading = false;

  constructor(private readonly rootStore: RootStore) {
    makeObservable(this);
  }

  @computed get sortedSpecs(): Spec[] {
    return [...this.specs].sort((a, b) => a.title.localeCompare(b.title));
  }

  @action.bound async loadSpecs(): Promise<void> {
    this.loading = true;
    this.specs = await specService.getAll();
    this.loading = false;
  }
}
```

Store categories: `domain/` (business entities), `session/` (auth, user), `ui/` (transient state). All stores via `RootStore` pattern + React Context. Components receive data via props; only container components use `observer()`.

### React Components

```tsx
import { observer } from 'mobx-react-lite';
import styles from './SpecList.module.scss';

export interface SpecListProps {
  specs: Spec[];
  onSelect: (id: string) => void;
}

export const SpecList = observer(function SpecList({
  specs,
  onSelect,
}: SpecListProps) {
  return (
    <ul className={styles.SpecList}>
      {specs.map((spec) => (
        <li
          key={spec.id}
          className={styles.SpecList__Item}
          onClick={() => onSelect(spec.id)}
        >
          {spec.title}
        </li>
      ))}
    </ul>
  );
});
```

Props interface named `{ComponentName}Props`, exported. Named exports only (no default exports).

### NestJS

- One module per domain: `AuthModule`, `SpecModule`, `AgentModule`
- Controllers handle HTTP only; services contain business logic
- DTOs validated with `class-validator` decorators
- Use NestJS `Logger`, never `console.log`
- ESM with `reflect-metadata` for decorators

### Error Handling

- Frontend: React error boundaries, toast notifications for user-facing errors
- Server: NestJS exception filters, typed exception classes from `@kg/shared`
- Never swallow errors silently — always log or re-throw
- All errors include context: what was attempted, what failed, relevant IDs

### Testing

- `bun:test` with `describe`, `test`, `expect` — not Jest or Vitest
- AAA pattern: Arrange, Act, Assert
- Descriptive names: `test('returns 401 when JWT is expired')`
- Co-located test files next to source
- `@testing-library/react` for component tests
- No mocking libraries — use dependency injection
- Mock only external boundaries (HTTP, database, file system)
- Test factories in `__fixtures__/` directories

## Project Structure Map

```
knowledge/
├── client/                          # Frontend workspace (@kg/client)
│   └── ui/                          # Main platform UI (React + Vite)
│       └── src/
│           ├── components/          # Shared UI components
│           ├── features/            # Feature-specific components
│           ├── hooks/               # Custom React hooks
│           ├── stores/              # MobX stores (domain/, session/, ui/)
│           ├── services/            # API client services
│           ├── styles/              # Global styles, variables, mixins
│           ├── types/               # Client-specific types
│           └── utils/               # Client-specific utilities
├── server/                          # Backend workspace (@kg/server)
│   ├── src/
│   │   ├── modules/                 # NestJS feature modules
│   │   │   ├── auth/                # Authentication (JWT, bcrypt)
│   │   │   ├── agent/               # (RUNTIME) Agent orchestration
│   │   │   ├── knowledge-graph/     # Knowledge graph operations
│   │   │   ├── rag/                 # RAG pipeline
│   │   │   └── ...
│   │   └── db/                      # Database (Drizzle schema, migrations)
│   └── agents/                      # (RUNTIME) Agent templates & skills
├── shared/                          # Shared workspace (@kg/shared)
│   └── src/
│       ├── types/                   # Shared TypeScript types
│       ├── dto/                     # Shared DTOs
│       ├── constants/               # Shared constants
│       └── utils/                   # Shared utilities
├── packages/                        # Internal packages
│   ├── mcp-servers/                 # MCP server implementations
│   └── claude-code-wrapper/         # Claude Code CLI wrapper
├── knowledge-graph/                 # (RUNTIME DATA) Git-backed knowledge
├── plans/                           # Architecture & design plans
├── scripts/                         # Build, dev, deploy scripts
│   └── ai-dev/                      # (DEV CONFIG) AI config management
├── config/                          # Shared configuration
├── docs/                            # Documentation
│   ├── adr/                         # Architecture Decision Records
│   └── ai-dev/                      # (DEV CONFIG) AI dev docs
├── .cursor/                         # (DEV CONFIG) Cursor rules & skills
│   ├── rules/                       # Cursor rule files
│   └── skills/                      # Cursor skill files
├── .claude/                         # (DEV CONFIG) Claude Code config
├── CLAUDE.md                        # (DEV CONFIG) Master Claude Code context
└── BOUNDARY.md                      # (DEV CONFIG) Dev vs runtime boundary ref
```

Workspace dependencies: `@kg/client` → `@kg/shared`, `@kg/server` → `@kg/shared`. No circular workspace dependencies.

## Workflow Commands

```bash
bun install              # Install all dependencies
bun run dev              # Start client + server via mprocs
bun run build            # Production builds (shared → server → client)
bun test                 # Run all tests
bun run lint             # ESLint check
bun run format           # Prettier auto-fix
bun run format:check     # Prettier check (CI)
bun run migrate          # Run database migrations
bun run seed             # Seed development database
bun run setup            # Initial project setup
bun run clean            # Clean build artifacts
```

**Before coding**: Ensure `bun install` is current, tests pass, check relevant plan tasks.
**After coding**: Run `bun test`, `bun run lint`, `bun run build`. Update/add tests for changed code.

## Agent Delegation Guidelines

Use sub-agents for tasks spanning multiple workspaces or large refactors. Do NOT use sub-agents for single-file edits or small additions.

**Scope rules**: Each sub-agent works within a single workspace/domain. The standard dependency chain for full-stack features: shared types → database → server → frontend → tests.

**Handoff format**: Describe what the sub-agent should do, which files it should touch, and the expected output.

See `docs/ai-dev/agent-types/` for full agent type specifications and selection guide.

## Skill Reference Index

### Frontend

- `.claude/skill-create-component.md` — Create a React component with BEM SCSS, props, tests
- `.claude/skill-create-store.md` — Create a MobX store with observables, actions, tests

### Server

- `.claude/skill-create-api-endpoint.md` — Create a NestJS endpoint with DTOs, service, tests
- `.claude/skill-create-migration.md` — Create a Drizzle ORM migration

### Knowledge Graph

- `.claude/skill-kg-operations.md` — Work on the knowledge graph module code

### Testing

- `.claude/skill-create-test.md` — Create unit/integration/E2E tests

### Full-Stack

- `.claude/skill-add-feature.md` — Orchestrate a full vertical slice across all layers
- `.claude/skill-debug.md` — Systematic debugging workflow
- `.claude/skill-refactor.md` — Safe refactoring with test verification

### Meta

- `.claude/skill-update-config.md` — Update AI development configuration
- `.claude/skill-create-mcp-tool.md` — Create an MCP tool for the runtime agent system

### Cursor Skills (`.cursor/skills/`)

- `create-component/SKILL.md` — Cursor-adapted component creation
- `create-store/SKILL.md` — Cursor-adapted store creation
- `create-api-endpoint/SKILL.md` — Cursor-adapted endpoint creation
- `create-module/SKILL.md` — Create a new NestJS module
- `create-test/SKILL.md` — Cursor-adapted test creation
- `add-feature/SKILL.md` — Cursor-adapted full-stack feature
- `debug/SKILL.md` — Cursor-adapted debugging
- `refactor/SKILL.md` — Cursor-adapted refactoring

## Do-Not Rules

1. **Never modify runtime agent files** when doing dev-config work (`server/src/modules/agent/prompts/`, `server/src/modules/agent/skills/`, `server/agents/`)
2. **Never install packages** without checking if an existing package covers the use case
3. **Never create new directories** without checking the project structure plan
4. **Never skip tests** — every code change should include or update tests
5. **Never use `console.log`** for debugging — use NestJS Logger on server; remove debug logs before committing
6. **Never use `any`** — use `unknown` and type guards instead
7. **Never use default exports** — named exports only
8. **Never nest BEM elements** — single-level nesting only (`&__Item`, not `&__Item &__Sub`)
9. **Never mutate MobX state outside actions** — `enforceActions: 'always'`
10. **Never import stores directly in leaf components** — pass data via props
