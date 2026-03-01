# Styling Guide — BEM + SCSS

This project uses **BEM (Block, Element, Modifier)** naming with **PascalCase** blocks, paired with SCSS for styling.

## Naming Convention

### Block
`PascalCase` — represents a standalone component.

```scss
.SpecEditor { ... }
.ChatPanel { ... }
.GraphNode { ... }
```

### Element
`PascalCase__PascalCase` — a part of a block.

```scss
.SpecEditor__Header { ... }
.SpecEditor__Body { ... }
.SpecEditor__Footer { ... }
.ChatPanel__MessageList { ... }
.ChatPanel__InputArea { ... }
```

### Modifier
`PascalCase--camelCase` or `PascalCase--kebab-case` — a variant of a block or element.

```scss
.SpecEditor--readonly { ... }
.SpecEditor--active { ... }
.GraphNode--selected { ... }
.GraphNode--highlighted { ... }
.ChatPanel__Message--agent { ... }
.ChatPanel__Message--user { ... }
```

## File Structure

Each component has a corresponding SCSS file:

```
components/
  SpecEditor/
    SpecEditor.tsx
    SpecEditor.scss       ← BEM styles for this component
    SpecEditor.test.tsx
```

## SCSS Template

```scss
@use '../../styles/variables' as v;
@use '../../styles/mixins' as m;

.ComponentName {
  // Block styles

  &__Element {
    // Element styles
  }

  &__OtherElement {
    // Another element
  }

  &--modifier {
    // Modifier styles
  }

  &--anotherModifier {
    // Another modifier
  }
}
```

## CSS Modules vs. Global BEM

This project uses **global BEM classes** (not CSS Modules). This means:
- Class names must be globally unique — BEM's naming convention ensures this
- Class names are readable in the DOM for debugging
- No need for generated class names

## Import Strategy

Global SCSS files (variables, mixins) are auto-imported by Vite's `additionalData` configuration. You can use them directly in component SCSS files without explicit imports.

## Theme Variables

Use **CSS custom properties** (`var(--token-name)`) for any value that changes between light and dark themes. Use **SCSS variables** (`$spacing-4`) for values that never change (spacing, static colors).

```scss
// Good — supports theming
color: var(--color-text-primary);
background: var(--color-surface);

// Good — static value
padding: v.$spacing-4;
border-radius: v.$radius-md;
```
