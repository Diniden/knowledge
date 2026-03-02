# Project Conventions

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| React component | PascalCase | `SpecEditor.tsx` |
| Component styles | PascalCase | `SpecEditor.scss` |
| NestJS module | kebab-case directory | `src/modules/auth/` |
| Type file | kebab-case | `shared/src/types/agent.ts` |
| Test file | colocated | `SpecEditor.test.tsx` |
| Utility | kebab-case | `shared/src/utils/validation.ts` |

## BEM CSS Naming

- **Block**: PascalCase — `SpecEditor`
- **Element**: `Block__Element` — `SpecEditor__Header`
- **Modifier**: `Block--modifier` — `SpecEditor--active`

```scss
.SpecEditor {
  &__Header { ... }
  &__Content { ... }
  &--active { ... }
}
```

## Import Ordering

1. Built-in modules (`fs`, `path`)
2. External packages (`react`, `@nestjs/common`)
3. Internal packages (`@kg/shared`)
4. Parent imports (`../`)
5. Sibling imports (`./`)

## TypeScript

- Use `type` imports: `import type { Spec } from '@kg/shared'`
- Strict mode enabled
- No `any` without justification

## Commit Messages

Follow Conventional Commits: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`
