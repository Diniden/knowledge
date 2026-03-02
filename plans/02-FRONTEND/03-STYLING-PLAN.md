# 02-FRONTEND / 03 — STYLING PLAN

> **Purpose**: Define the complete styling system including BEM methodology
> with PascalCase, SCSS file organization, theme system, design tokens,
> animations, responsive design, and all visual standards.
>
> **Phase**: 1 (Foundation)
> **Dependencies**: `02-FRONTEND/01-ARCHITECTURE-PLAN.md`
> **Estimated tasks**: 120+

---

## Table of Contents

1. [BEM Methodology Implementation](#1-bem-methodology-implementation)
2. [SCSS File Organization](#2-scss-file-organization)
3. [Design Tokens](#3-design-tokens)
4. [Theme System](#4-theme-system)
5. [Typography System](#5-typography-system)
6. [Spacing & Layout System](#6-spacing--layout-system)
7. [Color System](#7-color-system)
8. [Animation & Transition Standards](#8-animation--transition-standards)
9. [Responsive Design](#9-responsive-design)
10. [Z-Index Management](#10-z-index-management)
11. [Scrollbar Styling](#11-scrollbar-styling)
12. [Component Styling Patterns](#12-component-styling-patterns)
13. [Icon System](#13-icon-system)

---

## 1. BEM Methodology Implementation

### 1.1 Naming Convention

- [ ] **FE-STYLE-001**: Document the BEM naming convention for the project
  - Block: `PascalCase` (matches component name, e.g., `SpecEditor`)
  - Element: `PascalCase__Element` (e.g., `SpecEditor__Header`)
  - Modifier: `PascalCase--modifier` (e.g., `SpecEditor--active`)
  - Element with modifier: `PascalCase__Element--modifier` (e.g., `SpecEditor__Header--collapsed`)
- [ ] **FE-STYLE-002**: Define SCSS nesting rules (single level nesting)

  ```scss
  .SpecEditor {
    &__Header {
    }
    &__Content {
    }
    &__Footer {
    }
    &--active {
    }
    &--readonly {
    }
  }
  ```

  - Maximum one level of BEM nesting (`&__` and `&--`)
  - Pseudo-classes and media queries may nest inside elements
  - State classes (`.is-open`, `.has-error`) allowed as nested modifiers

- [ ] **FE-STYLE-003**: Define modifier naming conventions
  - Boolean modifiers: `--active`, `--disabled`, `--loading`, `--collapsed`, `--open`
  - Value modifiers: `--size-sm`, `--size-lg`, `--variant-primary`, `--variant-danger`
  - State modifiers: `--state-error`, `--state-success`
- [ ] **FE-STYLE-004**: Define multi-word naming in BEM
  - Multi-word blocks: `CommandPalette`, `GraphToolbar` (PascalCase, no separator)
  - Multi-word elements: `CommandPalette__SearchInput`, `GraphToolbar__ZoomControls`
  - Multi-word modifiers: `--fullWidth`, `--darkMode` (camelCase for multi-word modifiers)

### 1.2 BEM Anti-Patterns (Document and Enforce)

- [ ] **FE-STYLE-005**: Document BEM anti-patterns to avoid
  - No nested elements: `Block__Element__SubElement` → instead use `Block__SubElement`
  - No element of modifier: `Block--modifier__Element` → instead use `Block__Element--modifier`
  - No styling by tag name inside BEM blocks
  - No global utility classes overriding BEM blocks
  - No `!important` except for utility classes
- [ ] **FE-STYLE-006**: Configure Stylelint rules for BEM enforcement
  - Install `stylelint-selector-bem-pattern` or custom regex rule
  - Pattern: `/^[A-Z][a-zA-Z]*(__[A-Z][a-zA-Z]*)?(--[a-zA-Z][a-zA-Z]*)?$/`
  - Error on non-conforming class names within component SCSS files

### 1.3 CSS Strategy Decision

- [ ] **FE-STYLE-007**: Decide between global BEM classes vs. CSS Modules
  - Option A: Global BEM classes (`.SpecEditor__Header`) — simpler, classic BEM
  - Option B: CSS Modules (`:local(.header)`) — scoped by default, less BEM-reliant
  - Option C: Global BEM with scope prefix (namespaced BEM, e.g., `kg-SpecEditor`)
  - Recommendation: Global BEM (Option A) to match PRD conventions
- [ ] **FE-STYLE-008**: If using global BEM: ensure no class name collisions
  - Block name = component name = unique by convention
  - Lint rule to warn on duplicate block names across SCSS files

#### Design Decisions

> **Q**: Should the project use global BEM class names or CSS Modules? Global BEM is conventional and aligns with the PRD's BEM requirement, but CSS Modules provide automatic scoping. Can both coexist (global for shared, modules for feature components)?
> **A**: Use global BEM class names exclusively. The PRD mandates BEM SCSS with PascalCase naming, and mixing CSS Modules with BEM creates inconsistency in how developers think about scoping. BEM's naming convention (PascalCase\_\_Item) already provides practical uniqueness. Each component's SCSS file is imported globally, and the BEM naming prevents collisions without module hashing.

> **Q**: Should there be a namespace prefix on BEM blocks (e.g., `kg-Button`) to prevent collisions with third-party CSS, or is PascalCase sufficient?
> **A**: No namespace prefix. PascalCase BEM blocks (`.Button`, `.SpecEditor`, `.ChatPanel`) are sufficiently unique. Third-party CSS collisions are not a concern because: headless Radix UI has no styles, TipTap styles are scoped to `.ProseMirror`, and gen UI projects run in iframes with isolated CSS. Adding a prefix like `kg-` creates visual noise in markup with no practical benefit.

> **Q**: If a component is used inside a gen UI iframe, do its styles need to be isolated? Or are gen UI projects entirely independent CSS scopes?
> **A**: Gen UI projects are entirely independent CSS scopes. They run in sandboxed iframes and bundle their own CSS. They do not share the host app's stylesheet. Gen UI projects can use any CSS approach (BEM, CSS Modules, Tailwind, etc.) — the iframe boundary provides complete isolation.

> **Q**: Should Stylelint enforce BEM naming strictly (fail build on violations), or should it be a warning?
> **A**: Fail the build on BEM naming violations. Use `stylelint-selector-bem-pattern` configured for the PascalCase convention (`/^[A-Z][a-zA-Z]+(__[A-Z][a-zA-Z]+)?(--[a-z][a-zA-Z]+)?$/`). Strict enforcement prevents naming drift over time. Developers learn the pattern quickly, and Stylelint's auto-fix handles common mistakes.

> **Q**: How should pseudo-element nesting work within BEM? Are `::before` and `::after` allowed to nest inside `&__Element` blocks?
> **A**: Yes, pseudo-elements nest inside their element block. This is the natural SCSS pattern and the only place where deeper nesting is acceptable:
>
> ```scss
> .Card {
>   &__Header {
>     &::before { ... }
>     &::after { ... }
>   }
> }
> ```
>
> State pseudo-classes (`:hover`, `:focus`, `:disabled`) also nest inside elements. The single-level BEM nesting rule applies to BEM blocks/elements/modifiers, not CSS pseudo-selectors.

> **Q**: Should the project allow state classes (e.g., `.is-active`) alongside BEM modifiers, or should only BEM modifiers be used?
> **A**: Only BEM modifiers. Use `.ChatPanel--expanded` instead of `.is-expanded`. State classes create a parallel naming system that competes with BEM modifiers and makes it unclear which approach to use. The only exception: global utility classes for JS-driven states (`.is-hidden` for display:none, `.is-loading` for opacity changes), limited to 3-4 utilities defined in a `_utilities.scss` partial.

---

## 2. SCSS File Organization

### 2.1 Global Styles Directory

- [ ] **FE-STYLE-009**: Create `client/ui/src/styles/` directory structure
  ```
  styles/
  ├── _variables.scss       # Design tokens
  ├── _mixins.scss           # Reusable mixins
  ├── _functions.scss        # SCSS functions
  ├── _reset.scss            # CSS reset/normalize
  ├── _base.scss             # Base element styles
  ├── _typography.scss       # Typography rules
  ├── _animations.scss       # Keyframe animations
  ├── _utilities.scss        # Utility classes
  ├── _scrollbars.scss       # Scrollbar styling
  ├── _z-index.scss          # Z-index scale
  ├── themes/
  │   ├── _light.scss        # Light theme variables
  │   └── _dark.scss         # Dark theme variables
  └── global.scss            # Main entry point importing all partials
  ```
- [ ] **FE-STYLE-010**: Create `global.scss` import order
  ```scss
  @use 'variables';
  @use 'functions';
  @use 'mixins';
  @use 'reset';
  @use 'base';
  @use 'typography';
  @use 'animations';
  @use 'scrollbars';
  @use 'utilities';
  ```
- [ ] **FE-STYLE-011**: Configure Vite to auto-import variables and mixins
  - Use `css.preprocessorOptions.scss.additionalData` in `vite.config.ts`
  - Auto-import: `@use 'styles/variables' as *; @use 'styles/mixins' as *; @use 'styles/functions' as *;`
  - Every component SCSS file has access without explicit imports

### 2.2 Component SCSS Files

- [ ] **FE-STYLE-012**: Define component SCSS file naming convention
  - File name matches component name: `SpecEditor.scss` for `SpecEditor.tsx`
  - One SCSS file per component (no shared component SCSS files)
  - Import in the component's `.tsx` file: `import './SpecEditor.scss'`
- [ ] **FE-STYLE-013**: Define component SCSS file template

  ```scss
  .ComponentName {
    // Base block styles

    &__Element {
      // Element styles
    }

    &--modifier {
      // Modifier styles
    }
  }
  ```

- [ ] **FE-STYLE-014**: Define co-location rules
  - Component SCSS file lives next to its TSX file
  - Feature-level SCSS files not allowed (no `features/chat/chat-styles.scss`)
  - Global styles only in `styles/` directory

---

## 3. Design Tokens

### 3.1 Color Tokens

- [ ] **FE-STYLE-015**: Define primitive color palette in `_variables.scss`
  - Neutral: 10 shades from white to black (`$neutral-50` through `$neutral-950`)
  - Primary: 10 shades (`$primary-50` through `$primary-950`)
  - Accent: 10 shades for secondary actions
  - Semantic — Success: 5 shades (`$success-100` through `$success-900`)
  - Semantic — Warning: 5 shades
  - Semantic — Error/Danger: 5 shades
  - Semantic — Info: 5 shades
- [ ] **FE-STYLE-016**: Define edge type color tokens
  - `$edge-derived-from`: blue variant
  - `$edge-depends-on`: green variant
  - `$edge-related-to`: purple variant
  - `$edge-contradicts`: red/orange variant
  - `$edge-supersedes`: gray variant
- [ ] **FE-STYLE-017**: Define permission level color tokens
  - `$permission-full`: standard text color (no special treatment)
  - `$permission-summary`: amber/yellow tint indicating restricted view
- [ ] **FE-STYLE-018**: Define diff color tokens
  - `$diff-added-bg`: very light green tint
  - `$diff-removed-bg`: very light red tint
  - `$diff-modified-bg`: very light yellow tint
  - `$diff-added-text`: slightly darker green
  - `$diff-removed-text`: slightly darker red with strikethrough

### 3.2 Spacing Tokens

- [ ] **FE-STYLE-019**: Define spacing scale in `_variables.scss`
  - Base unit: 4px
  - `$space-0`: 0
  - `$space-1`: 4px
  - `$space-2`: 8px
  - `$space-3`: 12px
  - `$space-4`: 16px
  - `$space-5`: 20px
  - `$space-6`: 24px
  - `$space-8`: 32px
  - `$space-10`: 40px
  - `$space-12`: 48px
  - `$space-16`: 64px
  - `$space-20`: 80px
  - `$space-24`: 96px

### 3.3 Border & Shadow Tokens

- [ ] **FE-STYLE-020**: Define border tokens
  - `$border-width-thin`: 1px
  - `$border-width-medium`: 2px
  - `$border-width-thick`: 3px
  - `$border-color-default`: neutral-200
  - `$border-color-focus`: primary-500
  - `$border-color-error`: error-500
  - `$border-radius-sm`: 4px
  - `$border-radius-md`: 8px
  - `$border-radius-lg`: 12px
  - `$border-radius-xl`: 16px
  - `$border-radius-full`: 9999px (pills, circles)
- [ ] **FE-STYLE-021**: Define shadow tokens
  - `$shadow-sm`: `0 1px 2px rgba(0,0,0,0.05)`
  - `$shadow-md`: `0 4px 6px -1px rgba(0,0,0,0.1)`
  - `$shadow-lg`: `0 10px 15px -3px rgba(0,0,0,0.1)`
  - `$shadow-xl`: `0 20px 25px -5px rgba(0,0,0,0.1)`
  - `$shadow-inner`: `inset 0 2px 4px rgba(0,0,0,0.06)`
  - `$shadow-focus`: `0 0 0 3px rgba($primary-500, 0.3)` (focus ring)

### 3.4 Transition Tokens

- [ ] **FE-STYLE-022**: Define transition duration tokens
  - `$duration-fast`: 100ms
  - `$duration-normal`: 200ms
  - `$duration-slow`: 300ms
  - `$duration-slower`: 500ms
- [ ] **FE-STYLE-023**: Define transition easing tokens
  - `$ease-in`: `cubic-bezier(0.4, 0, 1, 0.2)`
  - `$ease-out`: `cubic-bezier(0, 0, 0.2, 1)`
  - `$ease-in-out`: `cubic-bezier(0.4, 0, 0.2, 1)`
  - `$ease-spring`: `cubic-bezier(0.175, 0.885, 0.32, 1.275)`

### 3.5 CSS Custom Properties

- [ ] **FE-STYLE-024**: Export SCSS tokens as CSS custom properties for runtime theming
  ```scss
  :root {
    --color-primary: #{$primary-500};
    --color-bg: #{$neutral-50};
    --color-text: #{$neutral-900};
    --color-border: #{$neutral-200};
    // ... all semantic tokens
  }
  ```
- [ ] **FE-STYLE-025**: Use CSS custom properties in component styles
  - Components reference `var(--color-primary)` instead of `$primary-500`
  - SCSS variables used for non-themeable values (spacing, breakpoints)
  - CSS custom properties used for all color and theme-sensitive values

#### Design Decisions

> **Q**: Should the project use a formal design token specification (like Style Dictionary) to generate tokens for multiple platforms, or are SCSS variables + CSS custom properties sufficient?
> **A**: SCSS variables + CSS custom properties are sufficient. There's only one platform (web), so Style Dictionary's multi-platform generation adds complexity without benefit. Define tokens as SCSS variables in `_tokens.scss`, compile to CSS custom properties for runtime theming (light/dark mode switching), and reference SCSS variables at build time for calculations.

> **Q**: Should design tokens be stored in a separate JSON/YAML file and compiled to SCSS, or defined directly in SCSS?
> **A**: Defined directly in SCSS. A `_tokens.scss` partial contains all design tokens as SCSS variables, organized by category (colors, spacing, typography, shadows, radii, z-indices). A `_theme.scss` partial maps these tokens to CSS custom properties for theme switching. No JSON intermediate — it adds a build step with no benefit for a single-platform project.

> **Q**: Are there existing brand guidelines or a design system to align with, or should the design tokens be created from scratch?
> **A**: Created from scratch, inspired by proven systems. Use Radix Colors as the foundation for the color palette (perceptually uniform, dark mode tested). Spacing and typography follow an 8px grid and modular type scale. The result should feel like a modern productivity tool (similar aesthetic to Linear, Notion, or Raycast).

---

## 4. Theme System

### 4.1 Light Theme

- [ ] **FE-STYLE-026**: Define light theme in `styles/themes/_light.scss`
  - Background: white to neutral-50
  - Text: neutral-900 (primary), neutral-600 (secondary), neutral-400 (muted)
  - Borders: neutral-200
  - Card backgrounds: white with subtle shadow
  - Input backgrounds: white
  - Focus rings: primary-500 with 30% opacity
  - Success/warning/error: standard semantic colors

### 4.2 Dark Theme

- [ ] **FE-STYLE-027**: Define dark theme in `styles/themes/_dark.scss`
  - Background: neutral-900 to neutral-950
  - Text: neutral-50 (primary), neutral-300 (secondary), neutral-500 (muted)
  - Borders: neutral-700
  - Card backgrounds: neutral-800 with no shadow (or subtle highlight)
  - Input backgrounds: neutral-800
  - Focus rings: primary-400 with 30% opacity
  - Adjusted semantic colors for dark backgrounds (lighter variants)
- [ ] **FE-STYLE-028**: Ensure all color tokens have dark theme equivalents
  - Every CSS custom property must be overridden in dark theme
  - No hard-coded colors in component SCSS (all via custom properties)

### 4.3 Theme Switching

- [ ] **FE-STYLE-029**: Implement theme switching via CSS class on `<html>` element
  - `.theme-light` (default), `.theme-dark`
  - CSS custom properties scoped to theme class
  ```scss
  .theme-light {
    --color-bg: #{$neutral-50};
  }
  .theme-dark {
    --color-bg: #{$neutral-900};
  }
  ```
- [ ] **FE-STYLE-030**: Implement `prefers-color-scheme` detection
  - Auto-apply dark theme if system preference is dark
  - Allow manual override via settings
  - Store preference in localStorage
- [ ] **FE-STYLE-031**: Implement theme transition
  - Smooth color transition when switching themes (200ms)
  - `transition: background-color 0.2s, color 0.2s, border-color 0.2s` on body
  - Disable transition on initial load (no flash)
- [ ] **FE-STYLE-032**: Create `hooks/useTheme.ts`
  - Returns current theme, toggle function
  - Syncs with `UILayoutStore` (application-level theme preference)
  - Applies theme class to `<html>` element

#### Design Decisions

> **Q**: How should the dark theme be designed? True dark (#000 background), soft dark (dark gray #1a1a2e), or dimmed (reduced brightness)?
> **A**: Soft dark. Background: #0F172A (slate-900), surface: #1E293B (slate-800), elevated surface: #334155 (slate-700). True dark (#000) causes excessive contrast and OLED smearing. The soft dark palette uses Radix Colors' dark theme algorithm, ensuring text contrast ratios meet WCAG AA. The overall feel is similar to VS Code's default dark theme.

> **Q**: Should images and illustrations be adjusted for dark mode (reduced brightness, inverted)?
> **A**: Images get a subtle brightness reduction (filter: brightness(0.9)) in dark mode to reduce glare. SVG illustrations and icons use CSS custom properties for fill colors, so they adapt automatically. No image inversion — it produces ugly results. User-uploaded images in specs are displayed as-is with the brightness filter only.

> **Q**: Should the graph visualization have a different color scheme in dark mode (since node/edge colors need to be visible on dark backgrounds)?
> **A**: Yes. Node fill colors shift to darker saturated variants in dark mode (e.g., indigo-800 instead of indigo-100 for primary nodes). Edge colors shift to lighter variants (indigo-400 instead of indigo-600). Text on nodes switches to light text. Use CSS custom properties for all graph colors so the theme switch is automatic. The `contradicts` edge remains red-orange in both themes.

---

## 5. Typography System

### 5.1 Font Configuration

- [ ] **FE-STYLE-033**: Select and configure primary font family
  - Recommendation: Inter (clean, modern, excellent readability) or system font stack
  - System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  - Load via `@font-face` or Google Fonts (if Inter)
  - Define `$font-family-sans` variable
- [ ] **FE-STYLE-034**: Select and configure monospace font family
  - For code blocks, commit hashes, spec IDs
  - Recommendation: JetBrains Mono, Fira Code, or system monospace
  - Define `$font-family-mono` variable
- [ ] **FE-STYLE-035**: Configure font loading strategy
  - `font-display: swap` for web fonts
  - Preload critical font files in `index.html`
  - Fallback to system fonts if web font fails to load

### 5.2 Type Scale

- [ ] **FE-STYLE-036**: Define font size scale in `_variables.scss`
  - `$font-size-xs`: 0.75rem (12px)
  - `$font-size-sm`: 0.875rem (14px)
  - `$font-size-base`: 1rem (16px)
  - `$font-size-lg`: 1.125rem (18px)
  - `$font-size-xl`: 1.25rem (20px)
  - `$font-size-2xl`: 1.5rem (24px)
  - `$font-size-3xl`: 1.875rem (30px)
  - `$font-size-4xl`: 2.25rem (36px)
- [ ] **FE-STYLE-037**: Define font weight scale
  - `$font-weight-light`: 300
  - `$font-weight-normal`: 400
  - `$font-weight-medium`: 500
  - `$font-weight-semibold`: 600
  - `$font-weight-bold`: 700
- [ ] **FE-STYLE-038**: Define line height scale
  - `$line-height-tight`: 1.25
  - `$line-height-normal`: 1.5
  - `$line-height-relaxed`: 1.75
  - `$line-height-loose`: 2

### 5.3 Typography Mixins

- [ ] **FE-STYLE-039**: Create heading mixins in `_mixins.scss`
  - `@mixin heading-1` — 2.25rem/bold/tight
  - `@mixin heading-2` — 1.875rem/bold/tight
  - `@mixin heading-3` — 1.5rem/semibold/tight
  - `@mixin heading-4` — 1.25rem/semibold/normal
  - `@mixin heading-5` — 1.125rem/medium/normal
  - `@mixin heading-6` — 1rem/medium/normal
- [ ] **FE-STYLE-040**: Create body text mixins
  - `@mixin body-lg` — 1.125rem/normal/relaxed
  - `@mixin body-base` — 1rem/normal/normal
  - `@mixin body-sm` — 0.875rem/normal/normal
  - `@mixin body-xs` — 0.75rem/normal/normal
- [ ] **FE-STYLE-041**: Create text utility mixins
  - `@mixin text-truncate` — single line ellipsis
  - `@mixin text-clamp($lines)` — multi-line clamp with ellipsis
  - `@mixin text-mono` — monospace font for code/IDs
  - `@mixin text-link` — styled link with hover/focus states

### 5.4 Base Typography Styles

- [ ] **FE-STYLE-042**: Set base typography in `_base.scss`
  - `html { font-size: 16px; }` (rem base)
  - `body { font-family: $font-family-sans; font-size: $font-size-base; line-height: $line-height-normal; color: var(--color-text); }`
  - Heading styles (h1-h6) using heading mixins
  - Paragraph, list, link base styles
  - Code element styling with monospace font

#### Design Decisions

> **Q**: Should the project use a web font (Inter, Geist, IBM Plex) or a system font stack? Web fonts are more consistent but add load time.
> **A**: Use Inter as the primary web font. Inter is designed for screens, has excellent readability at small sizes, supports a wide character set, and is free. It's the standard for modern productivity tools (Linear, Vercel, Figma use it). The load time (~20KB for woff2 variable font) is acceptable for a desktop-first app on broadband.

> **Q**: If using a web font, should it be self-hosted or loaded from Google Fonts / CDN?
> **A**: Self-hosted. Bundle the Inter woff2 files in `client/ui/public/fonts/`. Self-hosting eliminates the external dependency on Google Fonts, avoids GDPR concerns (no third-party requests), and enables proper caching headers. Declare `@font-face` in a `_fonts.scss` partial with `font-display: swap`.

> **Q**: Should the monospace font (for code, IDs) be a web font or system monospace?
> **A**: Use JetBrains Mono as a self-hosted web font for code blocks and inline code. It has excellent legibility for code, programming ligatures (optional), and pairs well with Inter. Fallback to the system monospace stack (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`). File size is ~15KB for the woff2 variable font.

> **Q**: Should variable fonts be used (for continuous weight/width control) or static font files?
> **A**: Variable fonts for both Inter and JetBrains Mono. Variable fonts reduce total file size (one file covers all weights vs. multiple files) and enable fine-grained weight control. Inter variable is ~100KB (all weights) vs. ~200KB+ for separate regular/medium/semibold/bold static files. Use `font-variation-settings` for precise weight control.

> **Q**: Should the type scale be modular (based on a ratio like 1.250 or 1.333) or custom-defined? Modular scales create visual harmony but may not fit all needs.
> **A**: Use a custom-defined scale based on practical UI needs. Values: 11px (caption), 12px (small/label), 13px (body-sm), 14px (body), 16px (body-lg/subtitle), 18px (h4), 20px (h3), 24px (h2), 30px (h1), 36px (display). This is loosely based on a 1.2 minor third ratio but adjusted for common UI patterns. Define as SCSS variables and CSS custom properties.

> **Q**: Should there be a fluid type scale (using `clamp()` for responsive sizes) or fixed sizes with breakpoint overrides?
> **A**: Fixed sizes. The app is desktop-first with a minimum viewport of 1024px, so the range of screen sizes is narrow. Fluid type adds complexity for minimal benefit. The 14px body size is comfortable across all target viewports. If tablet support becomes a priority, a single breakpoint override at 1024px reduces body to 13px.

---

## 6. Spacing & Layout System

### 6.1 Layout Mixins

- [ ] **FE-STYLE-043**: Create flexbox helper mixins in `_mixins.scss`
  - `@mixin flex-center` — center both axes
  - `@mixin flex-between` — space-between with center alignment
  - `@mixin flex-column` — column direction
  - `@mixin flex-row` — row direction (explicit)
  - `@mixin flex-wrap` — with wrap
- [ ] **FE-STYLE-044**: Create grid helper mixins
  - `@mixin grid($columns, $gap)` — basic grid setup
  - `@mixin grid-auto-fill($min-width, $gap)` — auto-fill responsive grid

### 6.2 Layout Constants

- [ ] **FE-STYLE-045**: Define layout dimension constants
  - `$header-height`: 56px
  - `$sidebar-width`: 260px
  - `$sidebar-collapsed-width`: 56px
  - `$chat-panel-min-width`: 300px
  - `$chat-panel-default-width`: 380px
  - `$chat-panel-max-width`: 600px
  - `$content-max-width`: 900px (for document editor)
  - `$resize-handle-width`: 6px

### 6.3 Spacing Utilities

- [ ] **FE-STYLE-046**: Create spacing utility classes (optional)
  - `.mt-1` through `.mt-16` for margin-top
  - `.mb-1`, `.ml-1`, `.mr-1`, `.mx-1`, `.my-1`, `.m-1`
  - `.pt-1` through `.pt-16` for padding-top
  - `.pb-1`, `.pl-1`, `.pr-1`, `.px-1`, `.py-1`, `.p-1`
  - `.gap-1` through `.gap-16` for flex/grid gap
  - Use sparingly — prefer BEM element styling over utility classes

#### Design Decisions

> **Q**: Should the project use a formal grid system (12-column, 16-column) or flexible CSS Grid/Flexbox layouts without a column system?
> **A**: Flexible CSS Grid/Flexbox without a column system. The app layout is panel-based (sidebar, editor, chat, graph), not content-column-based. A 12-column grid doesn't map to resizable split panes. Use an 8px spacing grid (all spacing values are multiples of 8px: 4, 8, 12, 16, 24, 32, 48, 64) for consistent internal spacing.

> **Q**: Should the layout dimensions (sidebar width, chat panel width, header height) be fixed values or configurable via CSS custom properties?
> **A**: CSS custom properties for all layout dimensions. Define `--sidebar-width: 260px`, `--chat-width: 380px`, `--header-height: 48px`, `--graph-panel-width: 400px` in `:root`. JavaScript (MobX UILayoutStore via `@action` methods) updates these properties when panels are resized. This enables CSS-based layout calculations (`calc(100vw - var(--sidebar-width) - var(--chat-width))`) without JS layout thrashing.

> **Q**: What should the maximum content width be for the spec document editor? 700px (like a typical reading column), 900px (wider), or full-width?
> **A**: 760px max-width for the content column, centered within the editor pane. This is optimal for reading long-form text (65-80 characters per line at 14px). Metadata bars and left borders extend slightly beyond the content column. In focus mode, the content column remains 760px centered in the full viewport.

> **Q**: Should the graph visualization canvas have a maximum size, or should it always fill the available space?
> **A**: Always fill the available space. The graph tree view expands to fill its container (whether a side panel at 400px or the full viewport in graph page mode). There's no maximum — larger containers show more tree rows and reduce the need for scrolling. The virtual scrolling via @tanstack/virtual ensures performance regardless of container size.

---

## 7. Color System

### 7.1 Semantic Color Assignments

- [ ] **FE-STYLE-047**: Define semantic color mappings in CSS custom properties
  - `--color-bg-primary`: main background
  - `--color-bg-secondary`: secondary/muted background
  - `--color-bg-tertiary`: tertiary/subtle background
  - `--color-bg-inverse`: inverse background (for contrast)
  - `--color-text-primary`: main text
  - `--color-text-secondary`: secondary/muted text
  - `--color-text-tertiary`: placeholder/hint text
  - `--color-text-inverse`: text on inverse backgrounds
  - `--color-text-link`: link color
  - `--color-border-default`: standard borders
  - `--color-border-focus`: focus indicator
  - `--color-border-error`: error indicator
- [ ] **FE-STYLE-048**: Define interactive state colors
  - `--color-interactive-hover`: hover state background
  - `--color-interactive-active`: active/pressed state
  - `--color-interactive-selected`: selected item background
  - `--color-interactive-disabled`: disabled element color
- [ ] **FE-STYLE-049**: Define surface colors
  - `--color-surface-card`: card background
  - `--color-surface-modal`: modal background
  - `--color-surface-tooltip`: tooltip background
  - `--color-surface-popover`: popover background
  - `--color-surface-sidebar`: sidebar background

### 7.2 Graph Colors

- [ ] **FE-STYLE-050**: Define comprehensive graph color palette
  - Node colors by state: default, selected, hovered, dimmed, highlighted
  - Edge colors per type (5 types, distinct and accessible)
  - Node border colors for permission levels
  - Background color for graph tree view
  - Selection highlight color
  - NodeCard colors (compressed and expanded variants)

### 7.3 Status Colors

- [ ] **FE-STYLE-051**: Define status indicator colors
  - `--color-status-online`: green
  - `--color-status-offline`: gray
  - `--color-status-busy`: amber
  - `--color-status-synced`: green
  - `--color-status-syncing`: blue
  - `--color-status-modified`: amber
  - `--color-status-conflicted`: red
  - `--color-status-error`: red

#### Design Decisions

> **Q**: What is the primary brand color? If not defined, should the project use a blue-based primary (conventional for productivity tools) or something more distinctive?
> **A**: Use an indigo-blue primary (#4F46E5 / Indigo-600) as the brand color. Indigo is distinctive enough to stand out from generic blue tools while remaining professional and accessible. It works well in both light and dark themes. The palette includes a full 10-shade ramp from indigo-50 (#EEF2FF) to indigo-950 (#1E1B4B).

> **Q**: How many color shades per color family are needed? The plan defines 10 for primary/neutral — is that sufficient, or do we need intermediate shades?
> **A**: 10 shades per family (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) is sufficient. This covers all use cases: 50 for subtle backgrounds, 100-200 for borders/hovers, 500-600 for primary text/fills, 700-900 for dark theme surfaces. Color families: primary (indigo), neutral (slate), success (green), warning (amber), danger (red), info (blue). No intermediate shades needed.

> **Q**: Should the color palette be based on an existing system (Tailwind colors, Material Design colors, Radix Colors) or custom-designed?
> **A**: Based on Radix Colors with custom primary (indigo) and neutral (slate) ramps. Radix Colors are designed for UI use cases: they're perceptually uniform, have guaranteed contrast ratios, and provide pre-built dark mode counterparts. Using Radix as a foundation saves significant design effort while producing professional results.

---

## 8. Animation & Transition Standards

### 8.1 Keyframe Animations

- [ ] **FE-STYLE-052**: Define `fadeIn` keyframe animation
  - `0% { opacity: 0; }` → `100% { opacity: 1; }`
- [ ] **FE-STYLE-053**: Define `fadeOut` keyframe animation
- [ ] **FE-STYLE-054**: Define `slideInFromRight` keyframe (for chat panel, drawers)
  - `0% { transform: translateX(100%); }` → `100% { transform: translateX(0); }`
- [ ] **FE-STYLE-055**: Define `slideInFromLeft` keyframe (for sidebar)
- [ ] **FE-STYLE-056**: Define `slideInFromBottom` keyframe (for mobile drawers)
- [ ] **FE-STYLE-057**: Define `scaleIn` keyframe (for modals, tooltips)
  - `0% { transform: scale(0.95); opacity: 0; }` → `100% { transform: scale(1); opacity: 1; }`
- [ ] **FE-STYLE-058**: Define `spin` keyframe (for spinner)
  - `0% { transform: rotate(0deg); }` → `100% { transform: rotate(360deg); }`
- [ ] **FE-STYLE-059**: Define `pulse` keyframe (for loading skeletons)
  - `0% { opacity: 1; }` → `50% { opacity: 0.5; }` → `100% { opacity: 1; }`
- [ ] **FE-STYLE-060**: Define `shimmer` keyframe (for skeleton wave effect)
  - Background gradient sliding from left to right
- [ ] **FE-STYLE-061**: Define `bounce` keyframe (for notification badge)
  - Small scale bounce: `1 → 1.2 → 0.9 → 1.1 → 1`

### 8.2 Transition Standards

- [ ] **FE-STYLE-062**: Define standard transition mixin
  - `@mixin transition($properties...)` — applies consistent duration and easing
  - Default: `200ms ease-in-out`
  - Fast: `100ms ease-out` (hover states)
  - Slow: `300ms ease-in-out` (panel open/close)
- [ ] **FE-STYLE-063**: Define which properties should transition
  - Always transition: `background-color`, `color`, `border-color`, `box-shadow`, `opacity`, `transform`
  - Never transition: `display`, `visibility` (use opacity instead), `width`/`height` (use transform scale instead)
  - Avoid `transition: all` — list specific properties

### 8.3 Reduced Motion

- [ ] **FE-STYLE-064**: Create reduced motion mixin
  ```scss
  @mixin reduced-motion {
    @media (prefers-reduced-motion: reduce) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- [ ] **FE-STYLE-065**: Apply reduced motion to all animation/transition definitions
  - Every `@keyframes` should have a reduced-motion fallback
  - Every component with transitions should include the mixin

#### Design Decisions

> **Q**: How animation-heavy should the UI be? Minimal (only essential transitions like open/close), moderate (transitions on hover, route changes, panel toggles), or rich (micro-interactions on every element)?
> **A**: Moderate. Animate panel open/close (150ms slide), hover states (100ms color transitions), tooltip appear/disappear (100ms fade), modal open/close (150ms fade+scale), and toast notifications (200ms slide-in). No route transition animations, no micro-interactions on every element, no loading skeleton shimmer effects. The goal is responsive feel without visual noise.

> **Q**: Should the project use a JavaScript animation library (Framer Motion, React Spring) for complex animations, or rely entirely on CSS?
> **A**: CSS transitions and animations for everything. The animation budget is moderate — nothing requires JS-orchestrated spring physics or complex choreography. CSS `transition` handles hover, open/close, and fade effects. CSS `@keyframes` handles the agent thinking dots and spinner. This avoids adding a ~30KB animation library to the bundle.

> **Q**: What is the performance budget for animations? Should animations be disabled on low-end devices?
> **A**: All animations must use only GPU-compositable properties (`transform`, `opacity`). No animations on `width`, `height`, `top`, `left`, or `margin`. Respect `prefers-reduced-motion: reduce` by disabling all transitions and animations for users who request it. No explicit low-end device detection — the `prefers-reduced-motion` media query is the standard mechanism.

> **Q**: Should route transitions be animated? If so, what style — crossfade, slide, or none?
> **A**: None. Route transitions are instant. This is a professional tool — speed of navigation is more important than visual polish on page changes. Panel transitions within a route (expand/collapse sidebar, open graph panel) use 150ms ease-out slide animations for spatial continuity.

> **Q**: Should the graph have animated edge connections (flowing dots or dashes to indicate direction)?
> **A**: No. Static arrowheads indicate direction. Flowing dots are distracting in a tool used for extended periods. The only graph animation is a brief 300ms ease-out transition when nodes move to new positions during layout recalculation (helps the user track where nodes went). New edges fade in over 200ms when created.

> **Q**: Should the agent "thinking" indicator be a simple dots animation, a progress bar, or something more elaborate?
> **A**: Three bouncing dots animation (classic "typing indicator" pattern) as the baseline. When the agent reports progress steps (via WebSocket), the dots are replaced with a status line showing the current step (e.g., "Analyzing spec dependencies..." → "Generating proposal..."). This gives users meaningful feedback when available, with a graceful fallback.

---

## 9. Responsive Design

### 9.1 Breakpoint Definitions

- [ ] **FE-STYLE-066**: Define breakpoint variables in `_variables.scss`
  - `$breakpoint-sm`: 640px
  - `$breakpoint-md`: 768px
  - `$breakpoint-lg`: 1024px
  - `$breakpoint-xl`: 1280px
  - `$breakpoint-2xl`: 1440px

### 9.2 Responsive Mixins

- [ ] **FE-STYLE-067**: Create mobile-first responsive mixins in `_mixins.scss`
  ```scss
  @mixin respond-to($breakpoint) {
    @if $breakpoint == sm {
      @media (min-width: $breakpoint-sm) {
        @content;
      }
    }
    @if $breakpoint == md {
      @media (min-width: $breakpoint-md) {
        @content;
      }
    }
    @if $breakpoint == lg {
      @media (min-width: $breakpoint-lg) {
        @content;
      }
    }
    @if $breakpoint == xl {
      @media (min-width: $breakpoint-xl) {
        @content;
      }
    }
    @if $breakpoint == 2xl {
      @media (min-width: $breakpoint-2xl) {
        @content;
      }
    }
  }
  ```
- [ ] **FE-STYLE-068**: Create max-width (desktop-first) responsive mixins
  ```scss
  @mixin respond-below($breakpoint) {
    @if $breakpoint == sm {
      @media (max-width: #{$breakpoint-sm - 1px}) {
        @content;
      }
    }
    // ... etc
  }
  ```
- [ ] **FE-STYLE-069**: Create range-based responsive mixin
  ```scss
  @mixin respond-between($min, $max) {
    @media (min-width: $min) and (max-width: #{$max - 1px}) {
      @content;
    }
  }
  ```

### 9.3 Responsive Patterns

- [ ] **FE-STYLE-070**: Define responsive layout patterns
  - Single column on mobile (< 768px)
  - Two columns on tablet (768px–1024px)
  - Three columns on desktop (> 1024px)
  - Sidebar collapses below 1024px
  - Chat panel collapses below 768px
- [ ] **FE-STYLE-071**: Define responsive font sizes
  - Base font stays 16px across breakpoints
  - Headings scale down slightly on mobile
  - Line heights remain consistent
- [ ] **FE-STYLE-072**: Define responsive spacing
  - Padding and margins reduce on smaller screens
  - Use `clamp()` for fluid spacing where appropriate
  - Container max-widths per breakpoint
- [ ] **FE-STYLE-073**: Define responsive component behavior
  - Buttons: full-width on mobile, auto-width on desktop
  - Modals: full-screen on mobile, centered card on desktop
  - Dropdowns: full-width sheet on mobile, positioned popup on desktop
  - Tables: horizontal scroll on mobile

#### Design Decisions

> **Q**: Is the application mobile-first (design for mobile, enhance for desktop) or desktop-first (design for desktop, adapt for mobile)? Given the knowledge authoring use case, desktop-first is typical.
> **A**: Desktop-first. Design for ≥1280px viewports as the primary experience. The app is a professional knowledge authoring tool where users work with multiple panels, a graph visualization, and a rich text editor — all desktop-centric activities. Adapt down to 1024px (tablet landscape) with panel stacking. Below 1024px is out of scope for MVP.

> **Q**: What is the minimum supported screen width? 320px (all smartphones)? 375px (iPhone 6+)? 768px (tablet only)?
> **A**: 1024px minimum supported width (tablet landscape / small laptops). The layout uses a single breakpoint at 1024px where panels switch from side-by-side to stacked/overlay mode. Below 1024px, the app shows a "Best experienced on a larger screen" message with limited functionality (read-only spec viewing and chat).

> **Q**: Should the mobile layout use a different navigation paradigm (bottom tabs, hamburger menu) or adapt the desktop layout?
> **A**: Hamburger menu for the sidebar (slide-over drawer), FAB for chat (full-screen overlay), and tab bar for switching between Editor and Graph views. This is a simplified navigation paradigm for <1024px viewports. Not a priority for MVP — implement only enough to prevent the app from being broken on smaller screens.

> **Q**: Should the tablet layout be a "mini desktop" (scaled down desktop layout) or a unique layout optimized for touch?
> **A**: Mini desktop. At 1024px–1279px, the desktop layout adapts by narrowing panels (sidebar at 200px, chat at 300px) and hiding the graph side panel by default (accessible via toggle). No touch-specific optimizations (larger tap targets, swipe gestures) for MVP. Touch targets are naturally ≥44px due to the component design.

> **Q**: Should split-pane views (editor + graph) be available on tablets in landscape orientation?
> **A**: Not in MVP. At 1024px, the editor + graph side panel doesn't leave enough room for both to be usable. Instead, provide a quick-toggle button to switch between editor and graph views. Split pane becomes available at ≥1280px width.

---

## 10. Z-Index Management

- [ ] **FE-STYLE-074**: Define z-index scale in `_z-index.scss`
  ```scss
  $z-index-base: 0;
  $z-index-dropdown: 100;
  $z-index-sticky: 200;
  $z-index-sidebar: 300;
  $z-index-header: 400;
  $z-index-overlay: 500;
  $z-index-modal-backdrop: 600;
  $z-index-modal: 700;
  $z-index-popover: 800;
  $z-index-tooltip: 900;
  $z-index-toast: 1000;
  $z-index-maximum: 9999;
  ```
- [ ] **FE-STYLE-075**: Document z-index usage rules
  - Never use arbitrary z-index values; always use scale variables
  - New z-index values require a scale addition and documentation
  - Stacking contexts: each major panel creates its own stacking context
- [ ] **FE-STYLE-076**: Implement stacking context isolation
  - `isolation: isolate` on Sidebar, MainContent, ChatPanel
  - Prevents z-index leaking between major layout areas

---

## 11. Scrollbar Styling

- [ ] **FE-STYLE-077**: Style scrollbars for webkit browsers in `_scrollbars.scss`
  - `&::-webkit-scrollbar { width: 8px; }`
  - `&::-webkit-scrollbar-track { background: var(--color-bg-secondary); }`
  - `&::-webkit-scrollbar-thumb { background: var(--color-border-default); border-radius: 4px; }`
  - `&::-webkit-scrollbar-thumb:hover { background: var(--color-text-tertiary); }`
- [ ] **FE-STYLE-078**: Style scrollbars for Firefox
  - `scrollbar-width: thin;`
  - `scrollbar-color: var(--color-border-default) var(--color-bg-secondary);`
- [ ] **FE-STYLE-079**: Create scrollbar mixin for consistent application
  ```scss
  @mixin custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: var(--color-border-default) transparent;
    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    &::-webkit-scrollbar-thumb {
      background: var(--color-border-default);
      border-radius: 4px;
    }
  }
  ```
- [ ] **FE-STYLE-080**: Apply custom scrollbar to all scrollable containers
  - Apply via global rule on `body`, `ScrollArea`, and scrollable panels
  - Thin scrollbar in chat panel and sidebar
  - Overlay scrollbar option for graph canvas

---

## 12. Component Styling Patterns

### 12.1 Focus Styles

- [ ] **FE-STYLE-081**: Define focus ring mixin
  ```scss
  @mixin focus-ring {
    outline: none;
    box-shadow: 0 0 0 3px var(--color-focus-ring);
  }
  ```
- [ ] **FE-STYLE-082**: Apply focus styles to all interactive elements
  - Buttons, inputs, links, select, checkboxes, radio buttons
  - Focus visible only on keyboard navigation (`:focus-visible`)
  - Remove focus on mouse click (`:focus:not(:focus-visible)`)
- [ ] **FE-STYLE-083**: Define focus styles for graph elements
  - Nodes: highlight border on focus
  - Edges: increase stroke width on focus

### 12.2 Interactive States

- [ ] **FE-STYLE-084**: Define interactive state mixin
  ```scss
  @mixin interactive {
    cursor: pointer;
    @include transition(background-color, color, border-color);
    &:hover {
      background-color: var(--color-interactive-hover);
    }
    &:active {
      background-color: var(--color-interactive-active);
    }
    &:disabled,
    &--disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
  }
  ```
- [ ] **FE-STYLE-085**: Define selected state pattern
  - `--selected` modifier or `.is-selected` class
  - Background highlight + left border accent
  - Consistent across all selectable components
- [ ] **FE-STYLE-086**: Define loading state pattern
  - Reduced opacity (0.6) on content
  - Overlay spinner or skeleton replacement
  - Pointer events disabled during loading

### 12.3 Card & Panel Patterns

- [ ] **FE-STYLE-087**: Define card elevation mixin
  ```scss
  @mixin card($elevation: 'raised') {
    background: var(--color-surface-card);
    border-radius: $border-radius-md;
    @if $elevation == 'flat' {
      border: 1px solid var(--color-border-default);
    }
    @if $elevation == 'raised' {
      box-shadow: $shadow-sm;
    }
    @if $elevation == 'floating' {
      box-shadow: $shadow-lg;
    }
  }
  ```
- [ ] **FE-STYLE-088**: Define panel styling pattern
  - Side panels (sidebar, chat): full-height, border separation, no shadow
  - Content panels: max-width centered, padded
  - Modal panels: centered, shadow, backdrop

### 12.4 Form Field Patterns

- [ ] **FE-STYLE-089**: Define form field styling mixin
  ```scss
  @mixin form-field {
    font-size: $font-size-base;
    padding: $space-2 $space-3;
    border: $border-width-thin solid var(--color-border-default);
    border-radius: $border-radius-md;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    @include transition(border-color, box-shadow);
    &:focus {
      border-color: var(--color-border-focus);
      @include focus-ring;
    }
    &:disabled {
      background: var(--color-bg-secondary);
      opacity: 0.6;
    }
    &--error {
      border-color: var(--color-border-error);
    }
  }
  ```
- [ ] **FE-STYLE-090**: Define label styling pattern
  - Above the input (stacked layout)
  - `font-size: $font-size-sm; font-weight: $font-weight-medium; margin-bottom: $space-1;`
  - Required indicator: red asterisk after label text
  - Error text below input in error color, `font-size: $font-size-sm`

#### Design Decisions

> **Q**: Should focus indicators be visible at all times or only for keyboard navigation (`:focus-visible`)? `:focus-visible` is preferred but older browsers may not support it well.
> **A**: Use `:focus-visible` exclusively. It's supported in all modern browsers (Chrome 86+, Firefox 85+, Safari 15.4+) and this is a desktop-first professional tool — older browser support is not a concern. Focus rings appear only on keyboard navigation, avoiding the visual noise of focus outlines on every mouse click.

> **Q**: What color should focus rings be? Primary color, or a distinct focus color that works on all backgrounds?
> **A**: A 2px solid ring using the primary indigo color (`var(--color-primary-500)`) with a 2px offset (`outline-offset: 2px`). On dark backgrounds where indigo might not have sufficient contrast, use a fallback with a white inner ring + indigo outer ring (double ring technique). This is distinctive enough to see on all surfaces.

> **Q**: Should there be a high-contrast mode in addition to light/dark themes?
> **A**: Not in MVP. Light and dark themes with WCAG AA contrast ratios cover the essential accessibility requirement. If `prefers-contrast: more` is detected, increase border widths from 1px to 2px and use full-opacity colors (no alpha transparency). Full high-contrast mode is a Phase 2 enhancement.

> **Q**: How should color-blind users be accommodated? Should the edge type colors be chosen to be distinguishable by all common forms of color blindness (checked with a simulator)?
> **A**: Yes. Edge types use both color AND line style for differentiation: `derived-from` (blue, solid), `depends-on` (purple, solid), `related-to` (gray, dashed), `contradicts` (red-orange, dashed + warning icon), `supersedes` (teal, dotted). Validate the palette with a deuteranopia/protanopia simulator (Coblis or Sim Daltonism). Never rely on color alone to convey meaning.

---

## 13. Icon System

- [ ] **FE-STYLE-091**: Select icon library
  - Recommendation: Lucide React (lightweight, tree-shakeable, consistent style)
  - Alternative: Heroicons (Tailwind-adjacent), Phosphor Icons (comprehensive)
- [ ] **FE-STYLE-092**: Define icon size scale
  - `$icon-size-xs`: 14px
  - `$icon-size-sm`: 16px
  - `$icon-size-md`: 20px
  - `$icon-size-lg`: 24px
  - `$icon-size-xl`: 32px
- [ ] **FE-STYLE-093**: Define icon color conventions
  - Default: inherits text color (`currentColor`)
  - Interactive: changes color on hover/active
  - Semantic: uses semantic color for status icons
- [ ] **FE-STYLE-094**: Create icon mixin for consistent sizing
  ```scss
  @mixin icon($size: 'md') {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: map-get($icon-sizes, $size);
    height: map-get($icon-sizes, $size);
    flex-shrink: 0;
  }
  ```

---

## Additional Design Decisions

### Third-Party Styling

> **Q**: How should third-party component styles be handled? If using a headless UI library, all styling is custom. If using a styled library (MUI, Chakra), how do we override their styles to match BEM?
> **A**: Radix UI is headless — it ships zero CSS. All styling is custom BEM SCSS applied to Radix primitives via `className` props. No style overrides needed. This is the cleanest approach: full control over appearance with no specificity wars against library styles.

> **Q**: Should the markdown editor (TipTap, ProseMirror) use its default styles or be completely restyled to match the design system?
> **A**: Completely restyled. TipTap's default styles are minimal and don't match the design system. Create a `_SpecEditor.scss` BEM file that styles all ProseMirror content elements (`.ProseMirror h1`, `.ProseMirror p`, etc.) to match the project's typography and spacing tokens. The editor chrome (toolbar, menus) uses the shared component library.

> **Q**: Should code syntax highlighting themes match the light/dark theme? If so, which highlight.js/Prism themes to use as a base?
> **A**: Yes, syntax highlighting themes switch with the app theme. Use Shiki (tree-sitter based, VS Code compatible themes) for syntax highlighting in code blocks. Light theme: `github-light`. Dark theme: `github-dark`. Shiki produces pre-colored HTML that respects the theme without runtime CSS. Customize the theme colors to use the project's palette for backgrounds.

### CSS Performance

> **Q**: Should critical CSS be inlined in the HTML for faster first paint? Vite can extract critical CSS.
> **A**: No. The app is a desktop SPA behind authentication — first paint speed is less critical than for a public marketing site. Vite's default CSS bundling (single CSS file per chunk, loaded via `<link>`) is sufficient. The total CSS size is small enough (<50KB) that inlining adds complexity without meaningful FCP improvement.

> **Q**: Should unused CSS be purged from the production build? With BEM (no dynamic class generation), this is straightforward.
> **A**: Yes, but rely on natural tree-shaking rather than a purge tool. Since each component imports its own SCSS file, and Vite tree-shakes unused components, unused CSS is naturally eliminated. No PurgeCSS needed. If CSS size becomes a concern, add PurgeCSS as a Vite plugin — but with BEM's explicit class names, unused CSS accumulation is minimal.

> **Q**: What is the CSS bundle size budget? All SCSS compiled should be under what threshold?
> **A**: Under 50KB gzipped for the entire CSS bundle (all routes). With BEM and no utility-class bloat, this is achievable. Log a CI warning at 40KB gzipped. Individual lazy-loaded route CSS chunks should be under 10KB each. Monitor CSS size with `vite-plugin-inspect` during development.

### Conventions & Governance

> **Q**: Who approves new design tokens or style changes — a single design authority, or any developer?
> **A**: Any developer can propose token changes via PR, but changes to `_tokens.scss` or `_theme.scss` require review from at least one designated design-conscious developer (marked as CODEOWNER for those files). This prevents unchecked token proliferation while not bottlenecking on a single person. New color values must include a justification for why existing tokens don't suffice.

> **Q**: Should there be a visual regression test suite for key UI states to catch unintended style changes?
> **A**: Yes. Playwright screenshot tests for 10-15 critical UI states: login page, empty document, document with specs, graph view, chat panel, diff view, modal dialog, dark mode variants. Screenshots are committed to the repo and compared in CI. Pixel diff threshold: 0.1% (allows for minor anti-aliasing differences). Run on PRs that touch `.scss` files or component code.

> **Q**: Should the project maintain a "style guide" page (in-app or Storybook) showing all design tokens, components, and patterns?
> **A**: Storybook serves as the style guide. A dedicated "Design Tokens" story page shows all colors (swatches), typography scale (specimens), spacing values, shadows, and radii. This is auto-generated from the SCSS token definitions. No in-app style guide page — Storybook is the canonical reference, accessible at a dev URL.

---

## Summary

### Task Count by Section

| Section                             | Tasks                                  |
| ----------------------------------- | -------------------------------------- |
| 1. BEM Methodology Implementation   | 8 (FE-STYLE-001 through FE-STYLE-008)  |
| 2. SCSS File Organization           | 6 (FE-STYLE-009 through FE-STYLE-014)  |
| 3. Design Tokens                    | 11 (FE-STYLE-015 through FE-STYLE-025) |
| 4. Theme System                     | 7 (FE-STYLE-026 through FE-STYLE-032)  |
| 5. Typography System                | 10 (FE-STYLE-033 through FE-STYLE-042) |
| 6. Spacing & Layout System          | 4 (FE-STYLE-043 through FE-STYLE-046)  |
| 7. Color System                     | 5 (FE-STYLE-047 through FE-STYLE-051)  |
| 8. Animation & Transition Standards | 14 (FE-STYLE-052 through FE-STYLE-065) |
| 9. Responsive Design                | 8 (FE-STYLE-066 through FE-STYLE-073)  |
| 10. Z-Index Management              | 3 (FE-STYLE-074 through FE-STYLE-076)  |
| 11. Scrollbar Styling               | 4 (FE-STYLE-077 through FE-STYLE-080)  |
| 12. Component Styling Patterns      | 10 (FE-STYLE-081 through FE-STYLE-090) |
| 13. Icon System                     | 4 (FE-STYLE-091 through FE-STYLE-094)  |
| **TOTAL**                           | **94**                                 |

> Note: Many design token tasks contain numerous sub-items (individual
> variables). The effective effort exceeds 120 discrete decisions/implementations.

### Definition of Done

This plan is complete when:

- [ ] All SCSS partials are created and imported in global.scss
- [ ] Design tokens defined and accessible in all component SCSS files
- [ ] Light and dark themes fully defined with all semantic tokens
- [ ] BEM naming convention documented and enforced via Stylelint
- [ ] Typography scale renders correctly across all breakpoints
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Scrollbars styled consistently across browsers
- [ ] Z-index scale prevents stacking issues
- [ ] Focus styles visible and accessible on all interactive elements
