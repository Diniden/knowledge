# Contributing

## Branching Strategy

| Branch      | Purpose                                       |
| ----------- | --------------------------------------------- |
| `main`      | Production-ready code. Protected.             |
| `develop`   | Integration branch for features.              |
| `feature/*` | New features (branch from `develop`).         |
| `fix/*`     | Bug fixes (branch from `develop`).            |
| `hotfix/*`  | Urgent production fixes (branch from `main`). |

```bash
# Create a feature branch
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

## Commit Message Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Commit messages are enforced via commitlint.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only                                      |
| `style`    | Formatting, missing semicolons, etc.                    |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or updating tests                                |
| `build`    | Build system or external dependencies                   |
| `ci`       | CI configuration                                        |
| `chore`    | Other changes that don't modify src or test files       |

### Scopes

Common scopes: `client`, `server`, `shared`, `db`, `auth`, `graph`, `agent`, `ci`, `docs`.

### Examples

```
feat(server): add user registration endpoint
fix(client): resolve graph rendering flicker on zoom
test(shared): add validation utility tests
docs: update README with setup instructions
```

## Pull Request Process

1. Create a branch from `develop` following the branching strategy above.
2. Make your changes, ensuring all tests pass (`bun test`).
3. Run linting and formatting before committing:
   ```bash
   bun run lint
   bun run format
   ```
4. Push your branch and open a PR targeting `develop`.
5. Fill in the PR template with a summary and test plan.
6. Request review from at least one team member.
7. Address review feedback. All CI checks must pass.
8. Squash-merge into `develop` once approved.

## Code Style

### General

- **ESLint** and **Prettier** handle code formatting and style. Configuration is at the repo root.
- Run `bun run lint` to check and `bun run format` to auto-fix.
- Use `const` by default; `let` only when reassignment is needed. Never use `var`.
- Prefer type imports: `import type { Foo } from './foo.js'`.
- Use strict equality (`===`) everywhere.

### Frontend (React + BEM SCSS)

- Components use PascalCase filenames: `SpecEditor.tsx`.
- Styles are co-located: `SpecEditor.module.scss`.
- BEM naming convention with PascalCase blocks:
  ```scss
  .SpecEditor {
    &__Header {
      /* element */
    }
    &--expanded {
      /* modifier */
    }
  }
  ```
- Single-level nesting only in BEM (no `&__Item &__SubItem`).
- MobX stores use `makeObservable` with explicit decorator annotations.
- Primitive UI components are strictly props-driven. Only top-level containers use `observer()`.

### Backend (NestJS)

- One module per feature domain (`auth`, `users`, `specs`, `graph`, etc.).
- DTOs use `class-validator` decorators for validation.
- Services contain business logic; controllers handle HTTP concerns only.
- Use dependency injection via NestJS providers. Mock via DI in tests.

### Testing

- Tests are co-located with source files: `foo.test.ts` next to `foo.ts`.
- Integration tests use `.integration.test.ts` suffix.
- Follow the AAA pattern: Arrange, Act, Assert.
- Use `bun:test` built-in `describe`, `test`, `expect`.
