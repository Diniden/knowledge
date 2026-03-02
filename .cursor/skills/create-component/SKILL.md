# Create React Component

> Scaffold a new React component with BEM SCSS, typed props, barrel export, and co-located test.

## When to Use

- Creating a new shared UI component in `client/ui/src/components/`
- Creating a feature-specific component in `client/ui/src/features/{feature}/components/`
- Any time a new `.tsx` component file is needed

## Prerequisites

- The parent directory exists (`components/` or `features/{feature}/components/`)
- The component name is in PascalCase (e.g., `SpecCard`, `GraphNode`)
- You know whether this is a leaf component (props-driven) or a container (uses `observer()`)

## Steps

1. **Verify location** — Use Glob to check the target directory exists and no component with this name already exists:

   ```
   Glob: client/ui/src/components/{ComponentName}/**
   ```

2. **Check related files** — Use Glob and Read to find similar components for pattern reference:

   ```
   Glob: client/ui/src/components/**/*.tsx
   ```

3. **Create the component file** — Use Write to create `{ComponentName}.tsx`:
   - Export a `{ComponentName}Props` interface
   - Export a named function component (not `React.FC`, not default export)
   - Import styles from the co-located `.module.scss`
   - Use BEM class names: `styles.{ComponentName}`, `styles.{ComponentName}__Element`
   - If container component: wrap with `observer()` from `mobx-react-lite`

   ```tsx
   import styles from './{ComponentName}.module.scss';

   export interface {ComponentName}Props {
     // typed props here
   }

   export function {ComponentName}({ ...props }: {ComponentName}Props) {
     return (
       <div className={styles.{ComponentName}}>
         {/* component content */}
       </div>
     );
   }
   ```

4. **Create the styles file** — Use Write to create `{ComponentName}.module.scss`:
   - Block name matches component name (PascalCase)
   - Single-level nesting only
   - Use CSS custom properties for theming

   ```scss
   .{ComponentName} {
     &__Element {
       // element styles
     }

     &--modifier {
       // modifier styles
     }
   }
   ```

5. **Create the barrel export** — Use Write to create `index.ts`:

   ```typescript
   export { {ComponentName} } from './{ComponentName}.js';
   export type { {ComponentName}Props } from './{ComponentName}.js';
   ```

6. **Create the test file** — Use Write to create `{ComponentName}.test.tsx`:
   - Use `bun:test` with `describe`, `test`, `expect`
   - Use `@testing-library/react` for rendering
   - Follow AAA pattern
   - Test default rendering, props variations, and interactions

   ```tsx
   import { describe, test, expect } from 'bun:test';
   import { render, screen } from '@testing-library/react';
   import { {ComponentName} } from './{ComponentName}.js';

   describe('{ComponentName}', () => {
     test('renders without crashing', () => {
       render(<{ComponentName} /* required props */ />);
       expect(screen.getByRole(/* ... */)).toBeTruthy();
     });
   });
   ```

7. **Run tests** — Use Shell to verify:
   ```
   Shell: bun test client/ui/src/components/{ComponentName}/
   ```

## Validation

- [ ] Component file exports named function and props interface
- [ ] No default exports anywhere
- [ ] SCSS uses PascalCase block name matching component name
- [ ] SCSS has single-level nesting only (no `&__A &__B`)
- [ ] Barrel `index.ts` re-exports component and props type
- [ ] Test file exists and passes
- [ ] No `any` types used
- [ ] Relative imports use `.js` extensions

## Common Issues

| Problem                          | Resolution                                                                |
| -------------------------------- | ------------------------------------------------------------------------- |
| SCSS module not found at runtime | Ensure filename is `{ComponentName}.module.scss` (not kebab-case)         |
| Store import in leaf component   | Pass data via props; only containers use `observer()`                     |
| Nested BEM elements              | Flatten to single level: `&__HeaderTitle` instead of `&__Header &__Title` |
| Missing `.js` extension          | All relative imports must include `.js` for ESM resolution                |

## References

- `.cursor/rules/frontend-components.mdc` — Component conventions
- `.cursor/rules/frontend-styling.mdc` — BEM SCSS conventions
- `.cursor/rules/general.mdc` — General coding standards
