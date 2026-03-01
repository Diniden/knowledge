# Contributing Guide

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Protected — requires PR review + passing CI. |
| `develop` | Integration branch for features. Requires passing CI. |
| `feature/*` | New features (e.g., `feature/spec-editor`) |
| `fix/*` | Bug fixes (e.g., `fix/auth-token-expiry`) |
| `release/*` | Release preparation branches |

**Workflow:**
1. Branch from `develop`
2. Develop and test locally
3. Open PR targeting `develop`
4. After review + CI green → merge
5. Periodically `develop` is merged to `main` for releases

## Commit Message Convention

This project follows [Conventional Commits](https://conventionalcommits.org):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `style` — formatting, no logic change
- `refactor` — code change that neither fixes a bug nor adds a feature
- `test` — adding or updating tests
- `chore` — maintenance (deps, build, etc.)
- `ci` — CI/CD changes
- `perf` — performance improvement
- `revert` — revert a previous commit

**Examples:**
```
feat(spec-editor): add inline agent assistance panel
fix(auth): prevent JWT reuse after logout
docs(readme): update setup instructions
chore(deps): update react to 18.3.1
```

## Code Style

- **TypeScript** — strict mode, no `any`, prefer `type` imports
- **React** — functional components, hooks, no class components
- **CSS** — BEM with PascalCase blocks (see [`docs/STYLING.md`](docs/STYLING.md))
- **ESM** — `import/export` throughout, no CommonJS
- **Formatting** — Prettier enforced via pre-commit hook

## PR Process

1. Ensure all CI checks pass
2. Self-review the diff before requesting review
3. Add a clear description with the motivation for the change
4. Link any related issues or plan tasks
5. Squash commits when merging if the history is noisy

## Testing

- Test files colocated with source: `Component.test.tsx`, `service.test.ts`
- Run tests: `bun test`
- Coverage goal: maintain or improve coverage on each PR

## Setting Up Development Environment

See [`README.md`](README.md) for setup instructions.
