# Contributing to Knowledge Graph Agent System

## Development Standards

- **ESM**: All TypeScript uses `"type": "module"`.
- **BEM CSS**: Components use PascalCase blocks, `__` for elements, `--` for modifiers.
- **Shared types**: Use `@kg/shared` for types used across client and server.

## Branching Strategy

- `main` — production-ready code
- `develop` — integration branch for features
- `feature/*` — feature branches (e.g., `feature/spec-editor`)
- `fix/*` — bug fix branches
- `release/*` — release preparation branches

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

**Examples**:
- `feat(client): add spec editor component`
- `fix(server): correct auth token validation`
- `chore(deps): update NestJS to 11.x`

## PR Process

1. Create a branch from `develop`.
2. Make changes with conventional commits.
3. Ensure `bun lint` and `bun test` pass.
4. Open a PR against `develop`.
5. Address review feedback.
6. Merge when CI passes and reviewed.

## Code Style

- ESLint and Prettier are enforced. Run `bun lint` and `bun format` before committing.
- Use `type` imports for types: `import type { Spec } from '@kg/shared'`.
