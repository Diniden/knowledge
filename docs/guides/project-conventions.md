# Project Conventions

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| React components | `PascalCase.tsx` | `SpecEditor.tsx` |
| React component SCSS | `PascalCase.scss` | `SpecEditor.scss` |
| React tests | `PascalCase.test.tsx` | `SpecEditor.test.tsx` |
| Hooks | `useCamelCase.ts` | `useSpecEditor.ts` |
| Services | `camelCase.service.ts` | `specEditor.service.ts` |
| Utils | `camelCase.ts` | `parseMarkdown.ts` |
| NestJS modules | `kebab-case.module.ts` | `specs.module.ts` |
| NestJS controllers | `kebab-case.controller.ts` | `specs.controller.ts` |
| NestJS services | `kebab-case.service.ts` | `specs.service.ts` |
| DTOs | `PascalCase.dto.ts` | `CreateSpec.dto.ts` |
| Type files | `kebab-case.ts` | `spec-types.ts` |
| Directories | `kebab-case/` | `spec-editor/` |

## Component Structure

```tsx
// Imports
import type { FC } from 'react';
import './ComponentName.scss';

// Types (local to this file only — shared types go in shared/)
interface ComponentNameProps {
  // ...
}

// Component
export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // Hooks first
  // Then derived state
  // Then handlers
  // Then render
  return (
    <div className="ComponentName">
      {/* ... */}
    </div>
  );
}
```

## BEM Naming

See [`docs/STYLING.md`](../STYLING.md) for the full BEM guide.

```scss
// Block
.SpecEditor { ... }

// Element — double underscore
.SpecEditor__Header { ... }
.SpecEditor__Body { ... }

// Modifier — double dash
.SpecEditor--readonly { ... }
.SpecEditor__Header--sticky { ... }
```

## Import Order

1. External packages (React, NestJS, etc.)
2. `@kg/*` workspace packages
3. `@ui/*` or `@modules/*` path aliases
4. Relative imports (`../../`, `../`, `./`)

ESLint enforces this automatically.

```ts
// 1. External
import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

// 2. Workspace
import type { Spec } from '@kg/shared';

// 3. Internal aliases
import { SpecRepository } from '@modules/specs/spec.repository';

// 4. Relative
import { parseMarkdown } from '../utils/parseMarkdown';
```

## Commit Messages

See [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for the full convention.

```
feat(spec-editor): add autosave indicator
fix(auth): handle expired refresh tokens gracefully
chore(deps): bump @nestjs/core to 10.3.2
```

## Error Handling

- Use shared error classes from `@kg/shared/errors`
- Never throw raw `Error` in business logic — use typed errors
- NestJS exception filters handle `AppError` → HTTP responses
- Client-side: all API calls wrapped in try/catch with typed error handling

## Testing

- Test files colocated with source code
- Unit tests for pure functions and services
- Integration tests for API endpoints (in `server/test/`)
- Component tests use `@testing-library/react`
- Test IDs (data-testid) use `kebab-case` format
