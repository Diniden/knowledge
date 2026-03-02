# Skill: Create React Component

> Scaffold a new React component with BEM SCSS module, props interface, barrel export, and test file.

## When to Use

- Adding a new UI component to `client/ui/src/components/` or `client/ui/src/features/`
- The component needs BEM-structured SCSS, a props interface, and a render test
- You know the component name, whether it is a leaf or container, and which domain area it belongs to

## Prerequisites

- `bun install` has been run in the workspace root
- The target domain directory exists or you are ready to create it
- If creating a container component, `mobx-react-lite` is available (already in project deps)

## Inputs

| Input           | Example                                                          | Required |
| --------------- | ---------------------------------------------------------------- | -------- |
| `ComponentName` | `SpecCard`                                                       | Yes      |
| `type`          | `leaf` or `container`                                            | Yes      |
| `domain`        | `specs`, `graph`, `shared`                                       | Yes      |
| `parentPath`    | `client/ui/src/components` (default) or `client/ui/src/features` | No       |

## Steps

### 1. Create the component directory

```
{parentPath}/{domain}/{ComponentName}/
```

### 2. Create the component file — `{ComponentName}.tsx`

**Leaf component:**

```tsx
import type { ReactNode } from 'react';

import styles from './{ComponentName}.module.scss';

export interface {ComponentName}Props {
  /** TODO: define props */
  children?: ReactNode;
}

export function {ComponentName}({ children }: {ComponentName}Props) {
  return (
    <div className={styles.{ComponentName}}>
      {children}
    </div>
  );
}
```

**Container component** (wraps with `observer`):

```tsx
import type { ReactNode } from 'react';

import { observer } from 'mobx-react-lite';

import styles from './{ComponentName}.module.scss';

export interface {ComponentName}Props {
  /** TODO: define props */
  children?: ReactNode;
}

export const {ComponentName} = observer(function {ComponentName}({ children }: {ComponentName}Props) {
  return (
    <div className={styles.{ComponentName}}>
      {children}
    </div>
  );
});
```

### 3. Create the SCSS module — `{ComponentName}.module.scss`

```scss
.{ComponentName} {
  &__Header {
  }

  &__Content {
  }

  &--variant {
  }
}
```

Keep single-level BEM nesting only. Never nest `&__Child &__Grandchild`.

### 4. Create the barrel export — `index.ts`

```ts
export { {ComponentName} } from './{ComponentName}.js';
export type { {ComponentName}Props } from './{ComponentName}.js';
```

### 5. Create the test file — `{ComponentName}.test.tsx`

```tsx
import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';

import { {ComponentName} } from './{ComponentName}.js';

describe('{ComponentName}', () => {
  test('renders without crashing', () => {
    render(<{ComponentName} />);
    expect(screen.getByText).toBeDefined();
  });

  test('applies root BEM class', () => {
    const { container } = render(<{ComponentName} />);
    const root = container.firstElementChild;
    expect(root?.className).toMatch(/{ComponentName}/);
  });
});
```

### 6. Register the component

- If the domain directory has its own `index.ts`, add a re-export there
- If the component is feature-scoped, ensure the feature barrel exports it

## Validation

1. **Renders**: `bun test {ComponentName}.test.tsx` passes
2. **Lint**: `bun run lint` reports no new errors
3. **Types**: `bun run build` compiles without errors
4. **Structure**: directory contains exactly `index.ts`, `{ComponentName}.tsx`, `{ComponentName}.module.scss`, `{ComponentName}.test.tsx`

## Common Issues

| Problem                             | Resolution                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| SCSS module import shows type error | Ensure `*.module.scss` type declarations exist in `client/ui/src/types/` or `vite-env.d.ts` |
| `observer` import not found         | Check that `mobx-react-lite` is in `client/ui/package.json` dependencies                    |
| BEM class not applying              | Verify SCSS module is imported as `styles` and accessed via `styles.{ComponentName}`        |
| Test fails with JSX transform error | Ensure test file uses `.tsx` extension and `tsconfig.json` has `jsx: "react-jsx"`           |
| Barrel export not picked up         | Check that parent `index.ts` re-exports the new component with `.js` extension              |
