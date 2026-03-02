# 02-FRONTEND / 03 — STYLING: Open Questions

> **Purpose**: Unresolved questions about styling methodology, theme design,
> design tokens, responsive strategy, and visual standards. Answers may
> change tasks in the plan.

---

## 1. BEM & CSS Strategy

### 1.1 BEM vs. CSS Modules

- **Q**: Should the project use global BEM class names or CSS Modules? Global
  BEM is conventional and aligns with the PRD's BEM requirement, but CSS
  Modules provide automatic scoping. Can both coexist (global for shared,
  modules for feature components)?
- **A:** Use global BEM class names exclusively. The PRD mandates BEM SCSS with PascalCase naming, and mixing CSS Modules with BEM creates inconsistency in how developers think about scoping. BEM's naming convention (PascalCase\_\_Item) already provides practical uniqueness. Each component's SCSS file is imported globally, and the BEM naming prevents collisions without module hashing.

- **Q**: Should there be a namespace prefix on BEM blocks (e.g., `kg-Button`)
  to prevent collisions with third-party CSS, or is PascalCase sufficient?
- **A:** No namespace prefix. PascalCase BEM blocks (`.Button`, `.SpecEditor`, `.ChatPanel`) are sufficiently unique. Third-party CSS collisions are not a concern because: headless Radix UI has no styles, TipTap styles are scoped to `.ProseMirror`, and gen UI projects run in iframes with isolated CSS. Adding a prefix like `kg-` creates visual noise in markup with no practical benefit.

- **Q**: If a component is used inside a gen UI iframe, do its styles need to
  be isolated? Or are gen UI projects entirely independent CSS scopes?
- **A:** Gen UI projects are entirely independent CSS scopes. They run in sandboxed iframes and bundle their own CSS. They do not share the host app's stylesheet. Gen UI projects can use any CSS approach (BEM, CSS Modules, Tailwind, etc.) — the iframe boundary provides complete isolation.

### 1.2 BEM Enforcement

- **Q**: Should Stylelint enforce BEM naming strictly (fail build on
  violations), or should it be a warning?
- **A:** Fail the build on BEM naming violations. Use `stylelint-selector-bem-pattern` configured for the PascalCase convention (`/^[A-Z][a-zA-Z]+(__[A-Z][a-zA-Z]+)?(--[a-z][a-zA-Z]+)?$/`). Strict enforcement prevents naming drift over time. Developers learn the pattern quickly, and Stylelint's auto-fix handles common mistakes.

- **Q**: How should pseudo-element nesting work within BEM? Are `::before` and
  `::after` allowed to nest inside `&__Element` blocks?
- **A:** Yes, pseudo-elements nest inside their element block. This is the natural SCSS pattern and the only place where deeper nesting is acceptable:

  ```scss
  .Card {
    &__Header {
      &::before { ... }
      &::after { ... }
    }
  }
  ```

  State pseudo-classes (`:hover`, `:focus`, `:disabled`) also nest inside elements. The single-level BEM nesting rule applies to BEM blocks/elements/modifiers, not CSS pseudo-selectors.

- **Q**: Should the project allow state classes (e.g., `.is-active`) alongside
  BEM modifiers, or should only BEM modifiers be used?
- **A:** Only BEM modifiers. Use `.ChatPanel--expanded` instead of `.is-expanded`. State classes create a parallel naming system that competes with BEM modifiers and makes it unclear which approach to use. The only exception: global utility classes for JS-driven states (`.is-hidden` for display:none, `.is-loading` for opacity changes), limited to 3-4 utilities defined in a `_utilities.scss` partial.

---

## 2. Design System

### 2.1 Design Tokens

- **Q**: Should the project use a formal design token specification (like
  Style Dictionary) to generate tokens for multiple platforms, or are SCSS
  variables + CSS custom properties sufficient?
- **A:** SCSS variables + CSS custom properties are sufficient. There's only one platform (web), so Style Dictionary's multi-platform generation adds complexity without benefit. Define tokens as SCSS variables in `_tokens.scss`, compile to CSS custom properties for runtime theming (light/dark mode switching), and reference SCSS variables at build time for calculations.

- **Q**: Should design tokens be stored in a separate JSON/YAML file and
  compiled to SCSS, or defined directly in SCSS?
- **A:** Defined directly in SCSS. A `_tokens.scss` partial contains all design tokens as SCSS variables, organized by category (colors, spacing, typography, shadows, radii, z-indices). A `_theme.scss` partial maps these tokens to CSS custom properties for theme switching. No JSON intermediate — it adds a build step with no benefit for a single-platform project.

- **Q**: Are there existing brand guidelines or a design system to align with,
  or should the design tokens be created from scratch?
- **A:** Created from scratch, inspired by proven systems. Use Radix Colors as the foundation for the color palette (perceptually uniform, dark mode tested). Spacing and typography follow an 8px grid and modular type scale. The result should feel like a modern productivity tool (similar aesthetic to Linear, Notion, or Raycast).

### 2.2 Color Palette

- **Q**: What is the primary brand color? If not defined, should the project
  use a blue-based primary (conventional for productivity tools) or something
  more distinctive?
- **A:** Use an indigo-blue primary (#4F46E5 / Indigo-600) as the brand color. Indigo is distinctive enough to stand out from generic blue tools while remaining professional and accessible. It works well in both light and dark themes. The palette includes a full 10-shade ramp from indigo-50 (#EEF2FF) to indigo-950 (#1E1B4B).

- **Q**: How many color shades per color family are needed? The plan defines
  10 for primary/neutral — is that sufficient, or do we need intermediate
  shades?
- **A:** 10 shades per family (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) is sufficient. This covers all use cases: 50 for subtle backgrounds, 100-200 for borders/hovers, 500-600 for primary text/fills, 700-900 for dark theme surfaces. Color families: primary (indigo), neutral (slate), success (green), warning (amber), danger (red), info (blue). No intermediate shades needed.

- **Q**: Should the color palette be based on an existing system (Tailwind
  colors, Material Design colors, Radix Colors) or custom-designed?
- **A:** Based on Radix Colors with custom primary (indigo) and neutral (slate) ramps. Radix Colors are designed for UI use cases: they're perceptually uniform, have guaranteed contrast ratios, and provide pre-built dark mode counterparts. Using Radix as a foundation saves significant design effort while producing professional results.

### 2.3 Dark Theme

- **Q**: How should the dark theme be designed? True dark (#000 background),
  soft dark (dark gray #1a1a2e), or dimmed (reduced brightness)?
- **A:** Soft dark. Background: #0F172A (slate-900), surface: #1E293B (slate-800), elevated surface: #334155 (slate-700). True dark (#000) causes excessive contrast and OLED smearing. The soft dark palette uses Radix Colors' dark theme algorithm, ensuring text contrast ratios meet WCAG AA. The overall feel is similar to VS Code's default dark theme.

- **Q**: Should images and illustrations be adjusted for dark mode (reduced
  brightness, inverted)?
- **A:** Images get a subtle brightness reduction (filter: brightness(0.9)) in dark mode to reduce glare. SVG illustrations and icons use CSS custom properties for fill colors, so they adapt automatically. No image inversion — it produces ugly results. User-uploaded images in specs are displayed as-is with the brightness filter only.

- **Q**: Should the graph visualization have a different color scheme in dark
  mode (since node/edge colors need to be visible on dark backgrounds)?
- **A:** Yes. Node fill colors shift to darker saturated variants in dark mode (e.g., indigo-800 instead of indigo-100 for primary nodes). Edge colors shift to lighter variants (indigo-400 instead of indigo-600). Text on nodes switches to light text. Use CSS custom properties for all graph colors so the theme switch is automatic. The `contradicts` edge remains red-orange in both themes.

---

## 3. Typography

### 3.1 Font Selection

- **Q**: Should the project use a web font (Inter, Geist, IBM Plex) or
  a system font stack? Web fonts are more consistent but add load time.
- **A:** Use Inter as the primary web font. Inter is designed for screens, has excellent readability at small sizes, supports a wide character set, and is free. It's the standard for modern productivity tools (Linear, Vercel, Figma use it). The load time (~20KB for woff2 variable font) is acceptable for a desktop-first app on broadband.

- **Q**: If using a web font, should it be self-hosted or loaded from
  Google Fonts / CDN?
- **A:** Self-hosted. Bundle the Inter woff2 files in `client/ui/public/fonts/`. Self-hosting eliminates the external dependency on Google Fonts, avoids GDPR concerns (no third-party requests), and enables proper caching headers. Declare `@font-face` in a `_fonts.scss` partial with `font-display: swap`.

- **Q**: Should the monospace font (for code, IDs) be a web font or system
  monospace?
- **A:** Use JetBrains Mono as a self-hosted web font for code blocks and inline code. It has excellent legibility for code, programming ligatures (optional), and pairs well with Inter. Fallback to the system monospace stack (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`). File size is ~15KB for the woff2 variable font.

- **Q**: Should variable fonts be used (for continuous weight/width control)
  or static font files?
- **A:** Variable fonts for both Inter and JetBrains Mono. Variable fonts reduce total file size (one file covers all weights vs. multiple files) and enable fine-grained weight control. Inter variable is ~100KB (all weights) vs. ~200KB+ for separate regular/medium/semibold/bold static files. Use `font-variation-settings` for precise weight control.

### 3.2 Scale

- **Q**: Should the type scale be modular (based on a ratio like 1.250 or
  1.333) or custom-defined? Modular scales create visual harmony but may not
  fit all needs.
- **A:** Use a custom-defined scale based on practical UI needs. Values: 11px (caption), 12px (small/label), 13px (body-sm), 14px (body), 16px (body-lg/subtitle), 18px (h4), 20px (h3), 24px (h2), 30px (h1), 36px (display). This is loosely based on a 1.2 minor third ratio but adjusted for common UI patterns. Define as SCSS variables and CSS custom properties.

- **Q**: Should there be a fluid type scale (using `clamp()` for responsive
  sizes) or fixed sizes with breakpoint overrides?
- **A:** Fixed sizes. The app is desktop-first with a minimum viewport of 1024px, so the range of screen sizes is narrow. Fluid type adds complexity for minimal benefit. The 14px body size is comfortable across all target viewports. If tablet support becomes a priority, a single breakpoint override at 1024px reduces body to 13px.

---

## 4. Spacing & Layout

### 4.1 Grid System

- **Q**: Should the project use a formal grid system (12-column, 16-column)
  or flexible CSS Grid/Flexbox layouts without a column system?
- **A:** Flexible CSS Grid/Flexbox without a column system. The app layout is panel-based (sidebar, editor, chat, graph), not content-column-based. A 12-column grid doesn't map to resizable split panes. Use an 8px spacing grid (all spacing values are multiples of 8px: 4, 8, 12, 16, 24, 32, 48, 64) for consistent internal spacing.

- **Q**: Should the layout dimensions (sidebar width, chat panel width,
  header height) be fixed values or configurable via CSS custom properties?
- **A:** CSS custom properties for all layout dimensions. Define `--sidebar-width: 260px`, `--chat-width: 380px`, `--header-height: 48px`, `--graph-panel-width: 400px` in `:root`. JavaScript (MobX UILayoutStore via `@action` methods) updates these properties when panels are resized. This enables CSS-based layout calculations (`calc(100vw - var(--sidebar-width) - var(--chat-width))`) without JS layout thrashing.

### 4.2 Content Width

- **Q**: What should the maximum content width be for the spec document
  editor? 700px (like a typical reading column), 900px (wider), or full-width?
- **A:** 760px max-width for the content column, centered within the editor pane. This is optimal for reading long-form text (65-80 characters per line at 14px). Metadata bars and left borders extend slightly beyond the content column. In focus mode, the content column remains 760px centered in the full viewport.

- **Q**: Should the graph visualization canvas have a maximum size, or should
  it always fill the available space?
- **A:** Always fill the available space. The graph tree view expands to fill its container (whether a side panel at 400px or the full viewport in graph page mode). There's no maximum — larger containers show more tree rows and reduce the need for scrolling. The virtual scrolling via @tanstack/virtual ensures performance regardless of container size.

---

## 5. Animations & Transitions

### 5.1 Animation Budget

- **Q**: How animation-heavy should the UI be? Minimal (only essential
  transitions like open/close), moderate (transitions on hover, route changes,
  panel toggles), or rich (micro-interactions on every element)?
- **A:** Moderate. Animate panel open/close (150ms slide), hover states (100ms color transitions), tooltip appear/disappear (100ms fade), modal open/close (150ms fade+scale), and toast notifications (200ms slide-in). No route transition animations, no micro-interactions on every element, no loading skeleton shimmer effects. The goal is responsive feel without visual noise.

- **Q**: Should the project use a JavaScript animation library (Framer Motion,
  React Spring) for complex animations, or rely entirely on CSS?
- **A:** CSS transitions and animations for everything. The animation budget is moderate — nothing requires JS-orchestrated spring physics or complex choreography. CSS `transition` handles hover, open/close, and fade effects. CSS `@keyframes` handles the agent thinking dots and spinner. This avoids adding a ~30KB animation library to the bundle.

- **Q**: What is the performance budget for animations? Should animations be
  disabled on low-end devices?
- **A:** All animations must use only GPU-compositable properties (`transform`, `opacity`). No animations on `width`, `height`, `top`, `left`, or `margin`. Respect `prefers-reduced-motion: reduce` by disabling all transitions and animations for users who request it. No explicit low-end device detection — the `prefers-reduced-motion` media query is the standard mechanism.

### 5.2 Specific Animations

- **Q**: Should route transitions be animated? If so, what style — crossfade,
  slide, or none?
- **A:** None. Route transitions are instant. This is a professional tool — speed of navigation is more important than visual polish on page changes. Panel transitions within a route (expand/collapse sidebar, open graph panel) use 150ms ease-out slide animations for spatial continuity.

- **Q**: Should the graph have animated edge connections (flowing dots or
  dashes to indicate direction)?
- **A:** No. Static arrowheads indicate direction. Flowing dots are distracting in a tool used for extended periods. The only graph animation is a brief 300ms ease-out transition when nodes move to new positions during layout recalculation (helps the user track where nodes went). New edges fade in over 200ms when created.

- **Q**: Should the agent "thinking" indicator be a simple dots animation, a
  progress bar, or something more elaborate?
- **A:** Three bouncing dots animation (classic "typing indicator" pattern) as the baseline. When the agent reports progress steps (via WebSocket), the dots are replaced with a status line showing the current step (e.g., "Analyzing spec dependencies..." → "Generating proposal..."). This gives users meaningful feedback when available, with a graceful fallback.

---

## 6. Responsive Design

### 6.1 Mobile Strategy

- **Q**: Is the application mobile-first (design for mobile, enhance for
  desktop) or desktop-first (design for desktop, adapt for mobile)? Given the
  knowledge authoring use case, desktop-first is typical.
- **A:** Desktop-first. Design for ≥1280px viewports as the primary experience. The app is a professional knowledge authoring tool where users work with multiple panels, a graph visualization, and a rich text editor — all desktop-centric activities. Adapt down to 1024px (tablet landscape) with panel stacking. Below 1024px is out of scope for MVP.

- **Q**: What is the minimum supported screen width? 320px (all smartphones)?
  375px (iPhone 6+)? 768px (tablet only)?
- **A:** 1024px minimum supported width (tablet landscape / small laptops). The layout uses a single breakpoint at 1024px where panels switch from side-by-side to stacked/overlay mode. Below 1024px, the app shows a "Best experienced on a larger screen" message with limited functionality (read-only spec viewing and chat).

- **Q**: Should the mobile layout use a different navigation paradigm
  (bottom tabs, hamburger menu) or adapt the desktop layout?
- **A:** Hamburger menu for the sidebar (slide-over drawer), FAB for chat (full-screen overlay), and tab bar for switching between Editor and Graph views. This is a simplified navigation paradigm for <1024px viewports. Not a priority for MVP — implement only enough to prevent the app from being broken on smaller screens.

### 6.2 Tablet Considerations

- **Q**: Should the tablet layout be a "mini desktop" (scaled down desktop
  layout) or a unique layout optimized for touch?
- **A:** Mini desktop. At 1024px–1279px, the desktop layout adapts by narrowing panels (sidebar at 200px, chat at 300px) and hiding the graph side panel by default (accessible via toggle). No touch-specific optimizations (larger tap targets, swipe gestures) for MVP. Touch targets are naturally ≥44px due to the component design.

- **Q**: Should split-pane views (editor + graph) be available on tablets in
  landscape orientation?
- **A:** Not in MVP. At 1024px, the editor + graph side panel doesn't leave enough room for both to be usable. Instead, provide a quick-toggle button to switch between editor and graph views. Split pane becomes available at ≥1280px width.

---

## 7. Accessibility Styling

- **Q**: Should focus indicators be visible at all times or only for keyboard
  navigation (`:focus-visible`)? `:focus-visible` is preferred but older
  browsers may not support it well.
- **A:** Use `:focus-visible` exclusively. It's supported in all modern browsers (Chrome 86+, Firefox 85+, Safari 15.4+) and this is a desktop-first professional tool — older browser support is not a concern. Focus rings appear only on keyboard navigation, avoiding the visual noise of focus outlines on every mouse click.

- **Q**: What color should focus rings be? Primary color, or a distinct focus
  color that works on all backgrounds?
- **A:** A 2px solid ring using the primary indigo color (`var(--color-primary-500)`) with a 2px offset (`outline-offset: 2px`). On dark backgrounds where indigo might not have sufficient contrast, use a fallback with a white inner ring + indigo outer ring (double ring technique). This is distinctive enough to see on all surfaces.

- **Q**: Should there be a high-contrast mode in addition to light/dark
  themes?
- **A:** Not in MVP. Light and dark themes with WCAG AA contrast ratios cover the essential accessibility requirement. If `prefers-contrast: more` is detected, increase border widths from 1px to 2px and use full-opacity colors (no alpha transparency). Full high-contrast mode is a Phase 2 enhancement.

- **Q**: How should color-blind users be accommodated? Should the edge type
  colors be chosen to be distinguishable by all common forms of color
  blindness (checked with a simulator)?
- **A:** Yes. Edge types use both color AND line style for differentiation: `derived-from` (blue, solid), `depends-on` (purple, solid), `related-to` (gray, dashed), `contradicts` (red-orange, dashed + warning icon), `supersedes` (teal, dotted). Validate the palette with a deuteranopia/protanopia simulator (Coblis or Sim Daltonism). Never rely on color alone to convey meaning.

---

## 8. Third-Party Styling

- **Q**: How should third-party component styles be handled? If using a
  headless UI library, all styling is custom. If using a styled library
  (MUI, Chakra), how do we override their styles to match BEM?
- **A:** Radix UI is headless — it ships zero CSS. All styling is custom BEM SCSS applied to Radix primitives via `className` props. No style overrides needed. This is the cleanest approach: full control over appearance with no specificity wars against library styles.

- **Q**: Should the markdown editor (TipTap, ProseMirror) use its default
  styles or be completely restyled to match the design system?
- **A:** Completely restyled. TipTap's default styles are minimal and don't match the design system. Create a `_SpecEditor.scss` BEM file that styles all ProseMirror content elements (`.ProseMirror h1`, `.ProseMirror p`, etc.) to match the project's typography and spacing tokens. The editor chrome (toolbar, menus) uses the shared component library.

- **Q**: Should code syntax highlighting themes match the light/dark theme?
  If so, which highlight.js/Prism themes to use as a base?
- **A:** Yes, syntax highlighting themes switch with the app theme. Use Shiki (tree-sitter based, VS Code compatible themes) for syntax highlighting in code blocks. Light theme: `github-light`. Dark theme: `github-dark`. Shiki produces pre-colored HTML that respects the theme without runtime CSS. Customize the theme colors to use the project's palette for backgrounds.

---

## 9. Performance

- **Q**: Should critical CSS be inlined in the HTML for faster first paint?
  Vite can extract critical CSS.
- **A:** No. The app is a desktop SPA behind authentication — first paint speed is less critical than for a public marketing site. Vite's default CSS bundling (single CSS file per chunk, loaded via `<link>`) is sufficient. The total CSS size is small enough (<50KB) that inlining adds complexity without meaningful FCP improvement.

- **Q**: Should unused CSS be purged from the production build? With BEM (no
  dynamic class generation), this is straightforward.
- **A:** Yes, but rely on natural tree-shaking rather than a purge tool. Since each component imports its own SCSS file, and Vite tree-shakes unused components, unused CSS is naturally eliminated. No PurgeCSS needed. If CSS size becomes a concern, add PurgeCSS as a Vite plugin — but with BEM's explicit class names, unused CSS accumulation is minimal.

- **Q**: What is the CSS bundle size budget? All SCSS compiled should be
  under what threshold?
- **A:** Under 50KB gzipped for the entire CSS bundle (all routes). With BEM and no utility-class bloat, this is achievable. Log a CI warning at 40KB gzipped. Individual lazy-loaded route CSS chunks should be under 10KB each. Monitor CSS size with `vite-plugin-inspect` during development.

---

## 10. Conventions & Governance

- **Q**: Who approves new design tokens or style changes — a single design
  authority, or any developer?
- **A:** Any developer can propose token changes via PR, but changes to `_tokens.scss` or `_theme.scss` require review from at least one designated design-conscious developer (marked as CODEOWNER for those files). This prevents unchecked token proliferation while not bottlenecking on a single person. New color values must include a justification for why existing tokens don't suffice.

- **Q**: Should there be a visual regression test suite for key UI states
  to catch unintended style changes?
- **A:** Yes. Playwright screenshot tests for 10-15 critical UI states: login page, empty document, document with specs, graph view, chat panel, diff view, modal dialog, dark mode variants. Screenshots are committed to the repo and compared in CI. Pixel diff threshold: 0.1% (allows for minor anti-aliasing differences). Run on PRs that touch `.scss` files or component code.

- **Q**: Should the project maintain a "style guide" page (in-app or
  Storybook) showing all design tokens, components, and patterns?
- **A:** Storybook serves as the style guide. A dedicated "Design Tokens" story page shows all colors (swatches), typography scale (specimens), spacing values, shadows, and radii. This is auto-generated from the SCSS token definitions. No in-app style guide page — Storybook is the canonical reference, accessible at a dev URL.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
