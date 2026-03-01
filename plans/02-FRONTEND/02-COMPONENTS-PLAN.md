# 02-FRONTEND / 02 — COMPONENTS PLAN

> **Purpose**: Define every UI component in the application — shared/common
> components, layout components, and feature-specific components. This includes
> component hierarchy, props interfaces, state management, composition
> patterns, and all visual states (loading, error, empty, populated).
>
> **Phase**: 1 (Foundation — base library) + 2–4 (Feature components)
> **Dependencies**: `02-FRONTEND/01-ARCHITECTURE-PLAN.md`, `02-FRONTEND/03-STYLING-PLAN.md`
> **Estimated tasks**: 230+

---

## Table of Contents

1. [Common Components](#1-common-components)
2. [Layout Components](#2-layout-components)
3. [Feedback Components](#3-feedback-components)
4. [Data Display Components](#4-data-display-components)
5. [Navigation Components](#5-navigation-components)
6. [Form Components](#6-form-components)
7. [Auth Feature Components](#7-auth-feature-components)
8. [Dashboard Feature Components](#8-dashboard-feature-components)
9. [Document & Spec Feature Components](#9-document--spec-feature-components)
10. [Chat Dialog Feature Components](#10-chat-dialog-feature-components)
11. [Graph Visualization Feature Components](#11-graph-visualization-feature-components)
12. [Version Control Feature Components](#12-version-control-feature-components)
13. [Generative UI Feature Components](#13-generative-ui-feature-components)
14. [Settings Feature Components](#14-settings-feature-components)
15. [Component Patterns & Conventions](#15-component-patterns--conventions)

---

## 1. Common Components

### 1.1 Button

- [ ] **FE-COMP-001**: Create `Button` component
  - Props: `variant` ('primary' | 'secondary' | 'ghost' | 'danger' | 'link'), `size` ('sm' | 'md' | 'lg'), `disabled`, `loading`, `icon`, `iconPosition` ('left' | 'right'), `fullWidth`, `type` ('button' | 'submit' | 'reset'), `onClick`, `children`
  - States: default, hover, active, focused, disabled, loading
  - Loading state shows spinner and disables interaction
  - Render as `<button>` for actions, `<a>` when `href` is provided
- [ ] **FE-COMP-002**: Create `IconButton` component
  - Props: `icon`, `size`, `variant`, `tooltip`, `aria-label` (required), `onClick`
  - Circular button with icon only
  - Tooltip shown on hover
  - Must have `aria-label` for accessibility
- [ ] **FE-COMP-003**: Create `ButtonGroup` component
  - Props: `children` (Button elements), `orientation` ('horizontal' | 'vertical')
  - Groups related buttons with shared border radius
  - Connected styling (no gap, shared borders)

#### Design Decisions

> **Q**: What are all the button variants needed? The plan lists primary, secondary, ghost, danger, link. Are there others (outline, subtle)?
> **A**: Six variants: `primary` (filled, brand color), `secondary` (outlined, neutral border), `ghost` (no background, hover reveals), `danger` (filled red for destructive actions), `link` (styled as text link, inline), and `outline` (like secondary but with a colored border matching the text). No `subtle` — it's too close to `ghost`. Each variant supports `sm`, `md`, `lg` sizes.

> **Q**: Should buttons support a loading state with built-in spinner, or should the parent handle loading display?
> **A**: Built-in loading state. Pass `isLoading={true}` to show a spinner replacing the icon/text, disable the button, and preserve the button's width (prevents layout shift). The spinner uses the button's text color. This avoids every parent reimplementing the same loading pattern and ensures consistent behavior.

### 1.2 Input Controls

- [ ] **FE-COMP-004**: Create `TextInput` component
  - Props: `label`, `value`, `onChange`, `placeholder`, `type` ('text' | 'email' | 'password' | 'url'), `error`, `helperText`, `disabled`, `required`, `prefix`, `suffix`, `clearable`
  - States: default, focused, error, disabled, readonly
  - Show error message below input when `error` is set
  - Show character count if `maxLength` is set
  - Clearable "x" button when `clearable` is true
- [ ] **FE-COMP-005**: Create `TextArea` component
  - Props: `label`, `value`, `onChange`, `placeholder`, `rows`, `maxRows`, `autoResize`, `error`, `helperText`, `disabled`, `required`
  - Auto-resize to content height when `autoResize` is true
  - Respect `maxRows` limit for auto-resize
- [ ] **FE-COMP-006**: Create `SearchInput` component
  - Props: `value`, `onChange`, `placeholder`, `onSearch`, `debounceMs`, `loading`
  - Search icon prefix
  - Debounced onChange callback
  - Clear button when value is non-empty
  - Loading spinner during search
- [ ] **FE-COMP-007**: Create `Select` component
  - Props: `label`, `value`, `onChange`, `options`, `placeholder`, `error`, `disabled`, `searchable`, `multiple`, `clearable`
  - Options: `{ value: string, label: string, icon?: ReactNode, disabled?: boolean }`
  - Dropdown with keyboard navigation (arrow keys, enter, escape)
  - Searchable variant with type-to-filter
  - Multi-select with tag chips for selected items
- [ ] **FE-COMP-008**: Create `Checkbox` component
  - Props: `label`, `checked`, `onChange`, `indeterminate`, `disabled`, `error`
  - Support indeterminate state for "select all" patterns
  - Accessible: uses native checkbox with custom styling
- [ ] **FE-COMP-009**: Create `RadioGroup` component
  - Props: `label`, `value`, `onChange`, `options`, `orientation` ('horizontal' | 'vertical'), `disabled`
  - Keyboard navigation between options
  - Fieldset with legend for accessibility
- [ ] **FE-COMP-010**: Create `Toggle` (Switch) component
  - Props: `label`, `checked`, `onChange`, `size`, `disabled`
  - Animated toggle between on/off states
  - `role="switch"` for accessibility
- [ ] **FE-COMP-011**: Create `Slider` component
  - Props: `label`, `value`, `onChange`, `min`, `max`, `step`, `marks`, `disabled`
  - Keyboard accessible (arrow keys adjust value)
  - Show current value label

### 1.3 Overlay Components

- [ ] **FE-COMP-012**: Create `Modal` component
  - Props: `open`, `onClose`, `title`, `size` ('sm' | 'md' | 'lg' | 'xl' | 'fullscreen'), `closable`, `children`, `footer`
  - Portal rendered outside component tree
  - Focus trap when open
  - Close on Escape key
  - Close on backdrop click (unless `closable` is false)
  - Body scroll lock when open
  - Entrance/exit animations (fade + scale)
- [ ] **FE-COMP-013**: Create `ConfirmDialog` component
  - Props: `open`, `onConfirm`, `onCancel`, `title`, `message`, `confirmLabel`, `cancelLabel`, `variant` ('info' | 'warning' | 'danger')
  - Built on Modal with standard confirm/cancel layout
  - Danger variant highlights confirm button in red
- [ ] **FE-COMP-014**: Create `Drawer` component
  - Props: `open`, `onClose`, `position` ('left' | 'right' | 'bottom'), `size`, `title`, `children`
  - Slide-in panel from edge of viewport
  - Backdrop overlay
  - Used for mobile sidebar, settings panels
- [ ] **FE-COMP-015**: Create `Popover` component
  - Props: `trigger`, `content`, `placement` ('top' | 'bottom' | 'left' | 'right'), `open`, `onOpenChange`, `triggerOn` ('click' | 'hover')
  - Positioned relative to trigger element
  - Auto-flip placement when near viewport edge
  - Click outside to close (click trigger)
  - Pointer events passthrough for hover trigger
- [ ] **FE-COMP-016**: Create `Tooltip` component
  - Props: `children` (trigger), `content`, `placement`, `delay`, `maxWidth`
  - Show on hover/focus with configurable delay
  - Hide on mouse leave/blur
  - Never block interaction with underlying element
  - Accessible via `aria-describedby`
- [ ] **FE-COMP-017**: Create `DropdownMenu` component
  - Props: `trigger`, `items`, `onSelect`, `placement`
  - Items: `{ label: string, icon?: ReactNode, onClick: () => void, disabled?: boolean, separator?: boolean, danger?: boolean }`
  - Keyboard navigation (arrow keys, enter, escape)
  - `role="menu"` with `role="menuitem"` children
- [ ] **FE-COMP-018**: Create `ContextMenu` component
  - Props: `children` (area), `items`, `onSelect`
  - Show on right-click within the children area
  - Position at cursor location
  - Same item structure as DropdownMenu

#### Design Decisions

> **Q**: Should modals use a centralized modal manager (one modal at a time, managed by store) or allow multiple stacked modals?
> **A**: Centralized modal management via application-level state in a UI store (class-based with `@observable activeModal`, `@action` open/close methods, provided via RootStore context). The modal state is application-level (which modal is showing and what data it needs) — but the Modal component itself is purely props-driven: it receives `isOpen`, `onClose`, `title`, and `children` as props. One modal at a time — stacked modals are a UX antipattern. If a flow requires multiple steps, use a multi-step modal (wizard) rather than stacking. A top-level `observer()` container reads from the store and renders the appropriate modal with props.

> **Q**: Should modals trap focus when open? This is an accessibility best practice but can be surprising to users.
> **A**: Yes, always trap focus. This is a WCAG requirement for modal dialogs. Radix UI's Dialog primitive handles focus trapping automatically, cycling focus between focusable elements within the modal. Users expect this behavior in professional tools — it prevents interacting with background content that's visually obscured.

> **Q**: What animation should modals use? Fade-in, scale-up, slide-from-bottom?
> **A**: Fade-in + slight scale-up (from 95% to 100% scale over 150ms, ease-out). The overlay backdrop fades in simultaneously. This is subtle, fast, and feels polished without being distracting. Close animation is the reverse (fade-out + scale-down to 95%, 100ms). No slide animations — they imply spatial origin that doesn't exist for modals.

### 1.4 Display Components

- [ ] **FE-COMP-019**: Create `Avatar` component
  - Props: `src`, `alt`, `name` (for initials fallback), `size` ('sm' | 'md' | 'lg'), `status` ('online' | 'offline' | 'busy')
  - Show image if `src` is provided
  - Show initials if image fails or `src` is not provided
  - Status indicator dot in corner
- [ ] **FE-COMP-020**: Create `Badge` component
  - Props: `children`, `variant` ('default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'), `size`, `dot` (boolean for notification dot)
  - Small label for status indicators, counts, tags
  - Dot variant for minimal notification indicator
- [ ] **FE-COMP-021**: Create `Tag` component
  - Props: `label`, `color`, `removable`, `onRemove`, `onClick`, `size`
  - Color-coded label for categorization
  - Optional remove button (x)
  - Clickable for filtering
- [ ] **FE-COMP-022**: Create `Icon` component
  - Props: `name`, `size`, `color`, `className`
  - Wrapper for icon library (Lucide recommended)
  - Consistent sizing and color theming
  - Accessible: `aria-hidden="true"` when decorative
- [ ] **FE-COMP-023**: Create `Divider` component
  - Props: `orientation` ('horizontal' | 'vertical'), `label` (optional text label in center)
  - Horizontal rule or vertical separator
  - Optional text label within the divider

#### Design Decisions

> **Q**: Should the project build all common components from scratch, or adopt an existing headless UI library (Radix UI, React Aria, Headless UI) and style them with BEM SCSS?
> **A**: Adopt Radix UI as the headless primitive layer and style with BEM SCSS. Building accessible dropdowns, dialogs, tooltips, and popovers from scratch is time-consuming and error-prone. Radix provides unstyled, accessible primitives that we wrap in BEM-classed components. Simple components (Button, Badge, Spinner) are built from scratch.

> **Q**: If using a headless library, which one? Radix UI (most complete, React-only), React Aria (Adobe, very accessible), or Headless UI (Tailwind team, smaller)?
> **A**: Radix UI. It has the best DX for React projects, composable primitive APIs, and handles complex accessibility patterns (focus trapping, arrow key navigation, dismissable overlays). React Aria is excellent but more verbose. Headless UI is too tightly coupled with Tailwind's mental model. Radix's component set covers all our needs: Dialog, Popover, Select, Dropdown Menu, Tooltip, Tabs, Accordion.

> **Q**: Should there be a Storybook or similar component gallery for developing and documenting shared components in isolation?
> **A**: Yes, use Storybook. It accelerates shared component development, provides living documentation, and enables visual regression testing. Set it up in Phase 1 alongside the component library. Each shared component gets a story file with variant demos and interactive controls. Storybook also serves as the style guide for onboarding.

---

## 2. Layout Components

### 2.1 Application Shell

- [ ] **FE-COMP-024**: Create `AppLayout` component
  - Props: `children` (route content)
  - Renders Header, Sidebar, MainContent, ChatPanel in grid layout
  - Manages overall layout dimensions and panel visibility
- [ ] **FE-COMP-025**: Create `Header` component
  - Fixed top bar spanning full width
  - Contains: logo, global navigation, command palette trigger, notification bell, user avatar menu
  - Responsive: collapses to hamburger menu on mobile
- [ ] **FE-COMP-026**: Create `Sidebar` component
  - Props: `open`, `onToggle`, `width`
  - Collapsible left panel
  - Contains: project selector, document tree, navigation links (Graph, Versions, Settings)
  - Collapsed state shows icons only
  - Overlay mode on tablet/mobile
- [ ] **FE-COMP-027**: Create `MainContent` component
  - Props: `children`
  - Flexible center area for routed content
  - Scrollable with overflow management
  - Padding and max-width constraints
- [ ] **FE-COMP-028**: Create `ChatPanel` component (layout shell)
  - Props: `open`, `onToggle`, `width`, `onResize`
  - Docked right panel for chat dialog
  - Resizable via drag handle on left edge
  - Collapse to icon on the side when minimized
  - Full-screen mode option

### 2.2 Panel & Container Components

- [ ] **FE-COMP-029**: Create `SplitPane` component
  - Props: `direction` ('horizontal' | 'vertical'), `defaultSizes`, `minSizes`, `maxSizes`, `onResize`, `children`
  - Divides area into resizable panes
  - Drag handle between panes with visual feedback
  - Snap-to-close when dragged past minimum
  - Double-click handle to reset to default sizes
- [ ] **FE-COMP-030**: Create `Panel` component
  - Props: `title`, `actions` (header action buttons), `collapsible`, `collapsed`, `onToggle`, `padding`, `children`
  - Card-like container with optional header
  - Collapsible body with animation
  - Action buttons in header (expand, close, settings)
- [ ] **FE-COMP-031**: Create `Card` component
  - Props: `children`, `padding`, `elevation` ('flat' | 'raised' | 'floating'), `onClick`, `interactive`
  - Styled container with background, border, optional shadow
  - Interactive variant with hover state for clickable cards
- [ ] **FE-COMP-032**: Create `ScrollArea` component
  - Props: `children`, `maxHeight`, `direction` ('vertical' | 'horizontal' | 'both')
  - Custom styled scrollbar matching theme
  - Scroll shadow indicators at top/bottom when content overflows
- [ ] **FE-COMP-033**: Create `ResizeHandle` component
  - Props: `direction` ('horizontal' | 'vertical'), `onResize`, `minSize`, `maxSize`
  - Draggable handle element for resizable containers
  - Visual feedback on hover and drag
  - Keyboard accessible (arrow keys)

### 2.3 Page Layout Components

- [ ] **FE-COMP-034**: Create `PageHeader` component
  - Props: `title`, `subtitle`, `breadcrumbs`, `actions` (action buttons)
  - Consistent page heading with breadcrumbs above
  - Right-aligned action buttons
- [ ] **FE-COMP-035**: Create `Breadcrumbs` component
  - Props: `items` (`{ label: string, href?: string, icon?: ReactNode }[]`)
  - Separator between items (/)
  - Last item is not a link (current page)
  - Truncate middle items if too long
- [ ] **FE-COMP-036**: Create `TabBar` component
  - Props: `tabs` (`{ id: string, label: string, icon?: ReactNode, badge?: number }[]`), `activeTab`, `onChange`
  - Horizontal tab strip
  - Active tab indicator (underline)
  - Badge for notification count
  - Scroll with arrows if tabs overflow
- [ ] **FE-COMP-037**: Create `EmptyState` component
  - Props: `icon`, `title`, `description`, `action` (CTA button)
  - Centered content for empty views
  - Illustrated empty state with descriptive text and action button

#### Design Decisions

> **Q**: Should the SplitPane component support more than 2 panes? For example, a 3-pane layout (sidebar + editor + chat)?
> **A**: Yes, the SplitPane component supports N panes with N-1 drag handles. The main workspace uses a 3- or 4-pane layout (sidebar | editor | graph/chat). Implement as a single `SplitPane` component that accepts an array of pane configurations (`{ minWidth, defaultWidth, collapsible }`) rather than nesting multiple 2-pane splits.

> **Q**: What should the minimum panel width be before it collapses/hides? Should this be configurable per usage?
> **A**: Configurable per pane via the `minWidth` prop. Defaults: sidebar 200px, editor 480px, chat 300px, graph panel 300px. When dragged below `minWidth`, the pane collapses to 0px with a re-expand button on the edge. The editor pane cannot be collapsed — it always stays at minimum width.

> **Q**: Should panel sizes persist in localStorage so the layout is restored on reload?
> **A**: Yes. Panel sizes are stored in the MobX UILayoutStore (UI store category, `@observable` properties keyed by route so `/docs` layout is separate from `/graph` layout). The store hydrates from localStorage in its constructor and persists via `reaction()` whenever layout values change. On reload, the stored sizes are restored. A "Reset layout" button in the View menu calls an `@action` to restore defaults.

> **Q**: On mobile, should the sidebar become a bottom navigation bar or a hamburger menu?
> **A**: Hamburger menu. The sidebar contains a document tree which is hierarchical and doesn't map to bottom nav tabs. On viewports <1024px, the sidebar collapses to a hamburger icon in the top-left that opens a slide-over drawer with the full document tree. Mobile is not an MVP priority, so keep the implementation simple.

> **Q**: Should the chat panel be accessible via a floating action button (FAB) on mobile?
> **A**: Yes. On viewports <1024px, the chat panel is hidden and replaced with a FAB (56px, bottom-right corner, brand-colored) that opens the chat as a full-screen overlay. The FAB shows an unread message badge (red dot with count). Cmd+K still works to focus chat.

> **Q**: Should the graph view be available on mobile, or replaced with a simplified list/tree view?
> **A**: The vertical tree layout is the primary (and only) graph view at all viewports. On viewports <1024px, the tree naturally adapts — its DOM-based rows stack vertically with horizontal scrolling for wide depth levels. The tree view is inherently more touch-friendly than a canvas-based approach. On very small viewports (<768px), collapse to a simplified list showing specs grouped by document with connection counts and edge type icons. Tapping a spec opens its detail view.

---

## 3. Feedback Components

### 3.1 Loading States

- [ ] **FE-COMP-038**: Create `Spinner` component
  - Props: `size` ('sm' | 'md' | 'lg'), `color`, `label` (screen reader text)
  - Animated spinning indicator
  - `role="status"` with `aria-label` for accessibility
- [ ] **FE-COMP-039**: Create `Skeleton` component
  - Props: `variant` ('text' | 'circular' | 'rectangular'), `width`, `height`, `lines` (for text variant), `animation` ('pulse' | 'wave')
  - Placeholder loading shapes matching content layout
  - Animated shimmer effect
- [ ] **FE-COMP-040**: Create `SkeletonCard` component
  - Pre-composed skeleton matching a Card layout
  - Used for document list items, spec cards
- [ ] **FE-COMP-041**: Create `SkeletonText` component
  - Multiple lines of skeleton text with varying widths
  - Used for spec content loading
- [ ] **FE-COMP-042**: Create `PageLoader` component
  - Full-page centered spinner with optional message
  - Used during initial app load and route transitions
- [ ] **FE-COMP-043**: Create `ProgressBar` component
  - Props: `value` (0-100), `variant` ('determinate' | 'indeterminate'), `color`, `label`
  - Determinate: shows percentage progress
  - Indeterminate: animated continuous bar

### 3.2 Notifications

- [ ] **FE-COMP-044**: Create `Toast` component
  - Props: `message`, `variant` ('success' | 'error' | 'warning' | 'info'), `duration`, `action`, `onDismiss`
  - Auto-dismiss after duration (configurable)
  - Manual dismiss with close button
  - Optional action button (e.g., "Undo")
  - Stacked display for multiple toasts
  - `role="status"` with `aria-live="polite"`
- [ ] **FE-COMP-045**: Create `ToastContainer` component
  - Portal rendered in top-right corner (configurable position)
  - Manages toast stack with enter/exit animations
  - Maximum visible toasts (older toasts are collapsed)
- [ ] **FE-COMP-046**: Create `Banner` component
  - Props: `message`, `variant` ('info' | 'warning' | 'error' | 'success'), `dismissable`, `action`
  - Full-width banner at top of content area
  - Persistent until dismissed or condition resolves
  - Used for: WebSocket disconnected, new version available, sync conflicts

### 3.3 Status Indicators

- [ ] **FE-COMP-047**: Create `StatusDot` component
  - Props: `status` ('online' | 'offline' | 'busy' | 'idle'), `size`, `pulse` (boolean for animation)
  - Small colored dot indicating status
  - Optional pulse animation for active states
- [ ] **FE-COMP-048**: Create `ConnectionIndicator` component
  - Displays WebSocket connection status
  - Green dot: connected
  - Yellow dot + "Reconnecting...": reconnecting
  - Red dot + "Disconnected": failed
  - Placed in header or footer
- [ ] **FE-COMP-049**: Create `SyncIndicator` component
  - Shows sync status with backend
  - States: synced, syncing, pending changes, conflict
  - Tooltip with details on hover

---

## 4. Data Display Components

### 4.1 Lists & Tables

- [ ] **FE-COMP-050**: Create `List` component
  - Props: `items`, `renderItem`, `keyExtractor`, `emptyState`, `loading`, `loadingSkeleton`
  - Generic list with customizable item rendering
  - Empty state when no items
  - Loading state with skeleton items
- [ ] **FE-COMP-051**: Create `VirtualList` component
  - Props: `items`, `renderItem`, `itemHeight`, `overscan`, `onEndReached`
  - Virtualized list for large datasets
  - Variable height support with measurement
  - Infinite scroll via `onEndReached` callback
- [ ] **FE-COMP-052**: Create `DataTable` component (optional, for admin/settings)
  - Props: `columns`, `data`, `sortable`, `pagination`, `selectable`
  - Sortable columns with sort indicator
  - Pagination controls
  - Row selection with checkboxes

### 4.2 Content Display

- [ ] **FE-COMP-053**: Create `MarkdownRenderer` component
  - Props: `content` (markdown string), `className`
  - Render markdown to HTML with sanitization
  - Support: headings, bold, italic, lists, links, code blocks, tables, images
  - Syntax highlighting for code blocks
  - Custom rendering for spec links (clickable graph node references)
- [ ] **FE-COMP-054**: Create `CodeBlock` component
  - Props: `code`, `language`, `showLineNumbers`, `highlightLines`, `copyable`
  - Syntax highlighting via highlight.js or Prism
  - Copy button in top-right corner
  - Line numbers toggle
  - Highlighted lines for emphasis
- [ ] **FE-COMP-055**: Create `Timestamp` component
  - Props: `date` (ISO string), `format` ('relative' | 'absolute' | 'smart'), `tooltip`
  - Relative: "5 minutes ago", "2 hours ago", "Yesterday"
  - Absolute: "Feb 28, 2026, 3:45 PM"
  - Smart: relative for recent, absolute for older
  - Full timestamp in tooltip
- [ ] **FE-COMP-056**: Create `UserInfo` component
  - Props: `user` (User object), `size`, `showName`, `showEmail`, `showStatus`
  - Avatar + name display
  - Compact and expanded variants
  - Online status indicator
- [ ] **FE-COMP-057**: Create `SpecSummary` component
  - Props: `spec` (Spec object), `showStatus`, `showAuthor`, `showTags`
  - Compact spec preview: title, first lines of content, tags, author, date
  - Used in lists, search results, graph node tooltips
- [ ] **FE-COMP-058**: Create `EdgeTypeLabel` component
  - Props: `edgeType` (EdgeType enum), `size`
  - Colored label showing edge type name
  - Icon per edge type
  - Consistent color mapping across all UI

---

## 5. Navigation Components

- [ ] **FE-COMP-059**: Create `NavLink` component
  - Props: `to`, `icon`, `label`, `badge`, `active`
  - Sidebar navigation link with icon and label
  - Active state highlighting
  - Badge for notification counts
- [ ] **FE-COMP-060**: Create `DocumentTree` component
  - Props: `documents`, `activeDocumentId`, `onSelect`, `onContextMenu`
  - Tree view of spec documents in the sidebar
  - Expandable nodes showing specs within each document
  - Drag-and-drop reordering (optional)
  - Context menu (right-click) for document actions
  - Icons for document status (modified, synced, conflicted)
- [ ] **FE-COMP-061**: Create `TreeNode` component
  - Props: `label`, `icon`, `children`, `expanded`, `onToggle`, `selected`, `onSelect`, `depth`
  - Single tree item with expand/collapse
  - Indentation based on depth
  - Keyboard navigation (arrow keys expand/collapse/select)
- [ ] **FE-COMP-062**: Create `CommandPalette` component
  - Props: `open`, `onClose`, `commands`
  - Full-screen overlay search input (Cmd+K style)
  - Search across specs, documents, commands, navigation
  - Keyboard-only operation (arrow keys, enter, escape)
  - Categories: Recent, Specs, Documents, Commands, Navigation
  - Fuzzy search matching
- [ ] **FE-COMP-063**: Create `UserMenu` component
  - Props: `user`
  - Dropdown from avatar in header
  - Items: Profile, Settings, Theme toggle, Logout
  - Show user name, email, avatar
- [ ] **FE-COMP-064**: Create `NotificationBell` component
  - Props: `unreadCount`, `onClick`
  - Bell icon with badge count
  - Dropdown showing recent notifications
  - Notification types: spec changes, agent messages, sync conflicts, inquiry items

---

## 6. Form Components

### 6.1 Form Layout

- [ ] **FE-COMP-065**: Create `Form` component
  - Props: `onSubmit`, `children`, `disabled`
  - `<form>` wrapper with submit handling
  - Prevent default submission
  - Disable all inputs when `disabled` is true
- [ ] **FE-COMP-066**: Create `FormField` component
  - Props: `label`, `required`, `error`, `helperText`, `children` (input element)
  - Wraps any input with label, error message, and helper text
  - Consistent spacing and layout
  - `aria-describedby` linking error/helper to input
- [ ] **FE-COMP-067**: Create `FormSection` component
  - Props: `title`, `description`, `children`
  - Groups related form fields with a heading
  - Optional description text
- [ ] **FE-COMP-068**: Create `FormActions` component
  - Props: `children` (buttons), `align` ('left' | 'right' | 'center' | 'space-between')
  - Footer area for form submit/cancel buttons
  - Consistent spacing and alignment

### 6.2 Specialized Inputs

- [ ] **FE-COMP-069**: Create `TagInput` component
  - Props: `tags`, `onChange`, `suggestions`, `placeholder`, `maxTags`
  - Add tags by typing and pressing Enter or comma
  - Remove tags with backspace or click X
  - Autocomplete suggestions from predefined list
  - Maximum tag limit
- [ ] **FE-COMP-070**: Create `FileUpload` component
  - Props: `accept`, `maxSize`, `multiple`, `onUpload`, `children` (drop zone content)
  - Drag-and-drop zone with click-to-browse fallback
  - File type and size validation
  - Upload progress indicator
  - Preview for image files
- [ ] **FE-COMP-071**: Create `ColorPicker` component (for edge/tag colors)
  - Props: `value`, `onChange`, `presets`
  - Preset color swatches
  - Optional custom color input (hex)
- [ ] **FE-COMP-072**: Create `PermissionSelect` component
  - Props: `value`, `onChange`, `specId`
  - Select component specialized for permission levels
  - Shows permission level descriptions
  - Warning when changing to more restrictive level

#### Design Decisions

> **Q**: Should form validation be handled at the component level (each input validates itself) or at the form level (form validates all inputs on submit)? Or both (real-time + submit)?
> **A**: Both. Individual inputs validate on blur (immediate feedback for obvious errors like empty required fields, invalid email format). The form validates all inputs on submit as a final gate. Use Zod schemas for validation logic shared between blur-level and submit-level validation. React Hook Form orchestrates both patterns natively.

> **Q**: Should the Select component use a native `<select>` on mobile for better UX, or always use the custom dropdown?
> **A**: Always use the custom dropdown (Radix Select). Mobile is not a primary target, and maintaining two rendering paths for one component adds complexity. The custom dropdown provides consistent behavior and styling across all viewports. If mobile becomes a priority later, this can be revisited.

> **Q**: Should form components support controlled mode only, or also uncontrolled mode?
> **A**: Support both via `React.forwardRef` and optional `value`/`onChange` props. If `value` is provided, the component is controlled; otherwise, it manages its own state internally. This follows the React convention used by Radix and React Hook Form. Most usage will be controlled (via React Hook Form's `register`), but uncontrolled is useful for simple one-off forms.

---

## 7. Auth Feature Components

- [ ] **FE-COMP-073**: Create `LoginPage` component
  - Full-page login form
  - Fields: email/username, password
  - "Remember me" checkbox
  - "Forgot password" link
  - "Register" link
  - Error display for invalid credentials
  - Loading state during authentication
- [ ] **FE-COMP-074**: Create `RegisterPage` component
  - Full-page registration form
  - Fields: username, email, password, confirm password
  - Password strength indicator
  - Validation: email format, password requirements, username availability
  - Success state with redirect to login
- [ ] **FE-COMP-075**: Create `AuthGuard` component
  - Wrapper that checks authentication state
  - Shows login page if not authenticated
  - Shows loading state while checking
  - Preserves intended destination for post-login redirect

---

## 8. Dashboard Feature Components

- [ ] **FE-COMP-076**: Create `DashboardPage` component
  - Overview page shown after login
  - Contains: RecentDocuments, ActivityFeed, GraphOverview, InquiryQueue
- [ ] **FE-COMP-077**: Create `RecentDocuments` component
  - Card list of recently accessed/modified spec documents
  - Shows title, last modified, author, spec count
  - Quick action buttons (open, edit)
- [ ] **FE-COMP-078**: Create `ActivityFeed` component
  - Timeline of recent activities
  - Events: spec created/modified, edge created, agent action, user joined
  - Filterable by event type
  - Infinite scroll for history
- [ ] **FE-COMP-079**: Create `GraphOverview` component
  - Mini graph visualization showing overall graph structure
  - Clickable to navigate to full graph view
  - Shows: total nodes, total edges, recent additions
- [ ] **FE-COMP-080**: Create `InquiryQueueWidget` component
  - List of pending inquiries from the agent
  - Priority-ordered
  - Quick action: view, resolve, dismiss
  - Badge count of unresolved inquiries
- [ ] **FE-COMP-081**: Create `QuickStats` component
  - Display key metrics: total specs, total documents, active branches, pending syncs
  - Card-based layout with icons and numbers

---

## 9. Document & Spec Feature Components

### 9.1 Document List

- [ ] **FE-COMP-082**: Create `DocumentListPage` component
  - Page displaying all spec documents
  - Search and filter controls
  - Sort options: name, last modified, spec count
  - Grid or list view toggle
  - Create new document button
- [ ] **FE-COMP-083**: Create `DocumentCard` component
  - Props: `document` (SpecDocument)
  - Card showing: title, description, spec count, last modified, author
  - Status indicator (synced, modified, conflicted)
  - Click to navigate to document editor
  - Context menu: rename, delete, duplicate, export
- [ ] **FE-COMP-084**: Create `DocumentListFilter` component
  - Props: `filters`, `onChange`
  - Filter by: author, tags, status, date range
  - Search by document title
  - Active filter chips displayed

### 9.2 Spec Document Editor (Container)

- [ ] **FE-COMP-085**: Create `DocumentEditorPage` component
  - Full editor view for a single spec document
  - Contains: DocumentHeader, SpecList, SpecEditor, EditorToolbar
  - Manages document-level state and operations
- [ ] **FE-COMP-086**: Create `DocumentHeader` component
  - Document title (editable inline)
  - Document description (editable)
  - Actions: save, export, version history, settings, share
  - Status: saved/unsaved indicator, last sync time
- [ ] **FE-COMP-087**: Create `SpecList` component
  - Ordered list of specs within the document
  - Each spec rendered as an editable block
  - Drag-and-drop reordering of specs
  - Add spec button between specs and at the end
  - Spec separator lines with visual indication
- [ ] **FE-COMP-088**: Create `SpecBlock` component
  - Single spec within the document editor
  - Spec boundary indicator (colored left border, header bar)
  - Spec metadata display: ID, author, last modified, tags, status
  - Expandable/collapsible spec content
  - Action menu: delete, move, duplicate, view in graph, version history
- [ ] **FE-COMP-089**: Create `SpecBoundary` component
  - Visual separator between specs in the document
  - Shows spec title and metadata in a compact header
  - Collapse/expand toggle
  - Status icons (modified, synced, conflicted)
  - "Add spec here" insert point
- [ ] **FE-COMP-090**: Create `AddSpecButton` component
  - Props: `position`, `documentId`, `onAdd`
  - Appears between specs and at document end
  - Subtle "+" button that expands on hover
  - Options: "New empty spec", "Generate with agent"

### 9.3 Spec Editor (Content Editing)

- [ ] **FE-COMP-091**: Create `SpecContentEditor` component
  - Rich text / markdown editor for spec content
  - (Implementation details in 06-SPEC-EDITOR-PLAN.md)
  - Props: `specId`, `content`, `onChange`, `readonly`
- [ ] **FE-COMP-092**: Create `EditorToolbar` component
  - Formatting controls: bold, italic, headings, lists, links, code, tables
  - Insert controls: image, file, spec link, code block
  - Agent actions: "Ask agent", "Improve with agent", "Split spec"
  - Undo/redo buttons
  - Responsive: collapses to overflow menu on small widths
- [ ] **FE-COMP-093**: Create `SpecMetadataPanel` component
  - Side panel or popover showing full spec metadata
  - Fields: ID, author, created date, modified date, version, commit hash
  - Tags editor (add/remove tags)
  - Permission level display/edit
  - Graph connections summary (linked specs)
- [ ] **FE-COMP-094**: Create `SpecTagEditor` component
  - Inline tag editing for specs
  - Uses TagInput component
  - Suggests existing tags from the project
- [ ] **FE-COMP-095**: Create `SpecStatusBar` component
  - Bottom bar showing spec save status
  - "Saving...", "Saved", "Error saving", "Unsaved changes"
  - Auto-save indicator with last save time
  - Manual save button
- [ ] **FE-COMP-096**: Create `CollaborationIndicator` component
  - Shows other users who have modified this spec
  - Avatar stack of recent contributors
  - Tooltip showing who modified and when
  - Indicator for pending remote changes

#### Design Decisions

> **Q**: How should spec boundaries be visually indicated within the document editor?
> **A**: Colored left border (3px, using a muted color per spec type or a consistent neutral-300) combined with a spec header bar showing the title. This creates a clear visual boundary without heavy card containers. The left border runs the full height of the spec content. A subtle 1px horizontal divider separates specs, doubling as the drag handle for reordering.

> **Q**: Should spec boundaries be editable (user can merge/split specs by dragging the boundary)?
> **A**: Splitting yes; merging no via drag. Users can split a spec by placing the cursor and using a "Split spec here" command (context menu or `/split` command). Merging is done by selecting two adjacent specs and choosing "Merge specs" from the context menu. Boundary dragging is too imprecise and risks accidental structural changes.

> **Q**: Should the spec metadata (author, date, tags) be visible by default, or only on hover/expand?
> **A**: Only on hover/expand. The spec header shows just the title and status badge by default. Hovering the header reveals a metadata row (author avatar, last edited date, tag pills). Clicking the header's "..." menu opens a full metadata popover with all fields. This keeps the editor clean while making metadata accessible.

> **Q**: Should the document editor show all specs expanded by default, or should long specs be collapsed to show only title + first few lines?
> **A**: All specs expanded by default. Collapsing hides content and makes the document harder to scan. For long documents (>15 specs), an outline panel on the left (within the editor area) lists all spec titles for quick jump navigation. Individual specs can be manually collapsed via a toggle on their header, but default is expanded.

> **Q**: Should there be a minimap/outline view showing all spec titles in the current document for quick navigation?
> **A**: Yes, an outline view (not a minimap). Show a collapsible outline panel within the editor's left margin listing all spec titles with their status indicators. Clicking a title smooth-scrolls to that spec. The outline highlights the currently visible spec. This is essential for documents with more than 5-6 specs.

> **Q**: Should the document editor support full-screen "focus mode" that hides all chrome (sidebar, chat, header)?
> **A**: Yes. Focus mode (`Cmd+Shift+F`) hides the sidebar, chat panel, and app header. The editor occupies the full viewport with a centered content column (max-width 800px). A minimal floating toolbar appears at the top on hover with document title and an "Exit focus mode" button. The chat minimized tab remains visible for Cmd+K access.

> **Q**: Should specs be reorderable via drag-and-drop within the document? If so, should they be draggable between documents as well?
> **A**: Yes, specs are reorderable via drag-and-drop within a document. Cross-document drag is not supported — use a "Move to document" menu action instead. Cross-document drag requires complex state management across different editor instances and is error-prone. The move action provides the same functionality with more precision.

> **Q**: What library should be used for drag-and-drop?
> **A**: Use `dnd-kit`. It's actively maintained, has excellent accessibility (keyboard reordering with announcements), small bundle size, and works well with React's rendering model. `react-beautiful-dnd` is in maintenance mode (Atlassian moved to Pragmatic drag and drop). Native HTML DnD lacks the accessibility features and smooth animations needed.

---

## 10. Chat Dialog Feature Components

### 10.1 Chat Container

- [ ] **FE-COMP-097**: Create `ChatDialog` component
  - Main chat container within the ChatPanel layout
  - Contains: ChatHeader, MessageList, ChatInput
  - Manages chat session state
- [ ] **FE-COMP-098**: Create `ChatHeader` component
  - Session info: agent type, session status
  - Actions: new session, session history, minimize, settings
  - Connection status indicator
- [ ] **FE-COMP-099**: Create `ChatSessionList` component
  - List of previous chat sessions
  - Shows: session date, first message preview, agent type
  - Click to load session history
  - Delete session option

### 10.2 Messages

- [ ] **FE-COMP-100**: Create `MessageList` component
  - Scrollable list of chat messages
  - Auto-scroll to newest message
  - "New messages" indicator when scrolled up
  - Date separators between days
  - Virtualized for long histories
- [ ] **FE-COMP-101**: Create `ChatMessage` component
  - Props: `message` (AgentMessage)
  - Different layout for user vs. agent messages
  - User messages: right-aligned, colored bubble
  - Agent messages: left-aligned, neutral bubble
  - Timestamp below message
  - Message actions (copy, reference)
- [ ] **FE-COMP-102**: Create `AgentThinkingIndicator` component
  - Animated indicator showing agent is processing
  - Typing dots animation or progress steps
  - Shows what the agent is doing ("Analyzing graph...", "Generating response...")
  - Duration timer for long operations
- [ ] **FE-COMP-103**: Create `TextMessage` component
  - Plain text message with markdown rendering
  - Code blocks with syntax highlighting
  - Links clickable with preview on hover
- [ ] **FE-COMP-104**: Create `InteractiveMessage` component
  - Message containing interactive elements
  - Buttons for user actions (approve, reject, edit)
  - Form fields for user input
  - Confirmation prompts
  - State: pending, responded, expired
- [ ] **FE-COMP-105**: Create `GraphLinkMessage` component
  - Message referencing knowledge graph nodes
  - Clickable spec links that highlight in graph or navigate to spec
  - Shows mini spec card on hover
  - Can contain multiple graph references
- [ ] **FE-COMP-106**: Create `SpecProposalMessage` component
  - Agent-proposed spec changes displayed as a message
  - Shows diff of proposed changes
  - Accept/reject/edit buttons
  - Inline editing of proposed content
- [ ] **FE-COMP-107**: Create `GenUIEmbedMessage` component
  - Message containing an embedded generative UI
  - Renders iframe inline in the chat
  - Compact/expanded toggle
  - Link to open in dedicated gen UI view

### 10.3 Chat Input

- [ ] **FE-COMP-108**: Create `ChatInput` component
  - Multi-line text area with auto-resize
  - Send button (also Enter to send, Shift+Enter for newline)
  - Attachment button for files
  - Slash command support (/help, /graph, /spec, /gen)
  - Mentioned spec auto-complete (@spec-name)
  - Keyboard shortcut to focus (Ctrl+/)
- [ ] **FE-COMP-109**: Create `ChatAttachments` component
  - Display attached files before sending
  - File preview (image thumbnail, file name + size)
  - Remove attachment button
- [ ] **FE-COMP-110**: Create `SlashCommandMenu` component
  - Dropdown showing available slash commands
  - Appears when user types /
  - Keyboard navigable
  - Shows command description and usage

#### Design Decisions

> **Q**: What is the full list of message types the chat must support?
> **A**: Full message type list: `text` (plain/markdown), `interactive` (buttons/forms), `graph-link` (clickable spec references), `code-block` (syntax-highlighted), `gen-ui-embed` (iframe reference), `spec-proposal` (diff preview with accept/reject), `image` (attached/generated images), `file` (downloadable attachment), `status` (system messages like "Agent completed task"), and `inquiry` (agent-flagged issue requiring user input). No tables or charts as standalone types — they appear within text messages as markdown.

> **Q**: Should messages support threading/replies, or is it always a flat chronological list?
> **A**: Flat chronological list. Threading adds significant UI complexity and the chat is a human-agent dialog, not a team conversation. The agent's context model handles conversational continuity without explicit threads. Users can reference previous messages by quoting (select text + reply), but the messages appear in the flat list.

> **Q**: Should messages be editable after sending? Should they be deletable?
> **A**: Not editable after sending — chat history is a reference log per the PRD. Messages are deletable by the sender (soft delete: replaced with "Message deleted" placeholder) to clean up mistakes. Agent messages are never deletable by users. Deletion does not affect the agent's conversation context.

> **Q**: When the agent proposes a spec change and the user accepts, should the message update in-place to show "Accepted" status, or should a new message appear confirming the action?
> **A**: Both. The original interactive message updates in-place: buttons are replaced with a status badge ("Accepted" in green or "Rejected" in gray) with a timestamp. A new system message also appears in the chat confirming the action with a link to the affected spec. This provides clear status on the proposal and chronological confirmation.

> **Q**: Should interactive message buttons have expiration?
> **A**: Yes. Interactive buttons expire when a newer agent message supersedes the proposal (e.g., agent proposes a revised version). Expired buttons show as disabled with a "Superseded" label. Time-based expiration is not needed — only logical supersession. Users can still view the expired proposal's diff for reference.

> **Q**: How should forms within interactive messages handle validation?
> **A**: Client-side validation first for basic constraints (required fields, format checks) defined in the form schema the agent provides. Invalid submissions are blocked with inline error messages. The agent still validates server-side for semantic correctness and can respond with errors for issues the client can't check. This provides instant feedback for obvious mistakes.

> **Q**: Should the chat panel support multiple simultaneous conversations (tabs), or only one active conversation at a time?
> **A**: One active conversation at a time. Multiple tabs fragment the agent's context and confuse the interaction model. Past sessions are accessible via a "History" button that opens a session list. Starting a "New conversation" archives the current session and begins fresh. The active session persists across page navigation.

> **Q**: Should there be a way to "pin" important messages in the chat for quick reference?
> **A**: Yes. Users can pin messages via a pin icon on hover. Pinned messages appear in a collapsible "Pinned" section at the top of the chat panel. Maximum 10 pinned messages per session. Pins are stored per-session and persist with the session history. This is useful for keeping agent proposals or key decisions visible.

> **Q**: Should the chat support markdown formatting in user messages?
> **A**: Yes. User messages support a subset of markdown: bold, italic, inline code, code blocks, and links. No need for a rich text toolbar — users type markdown syntax directly. The input renders a live preview (markdown is rendered in the sent message). This serves technical users who naturally write in markdown.

---

## 11. Graph Visualization Feature Components

### 11.1 Graph Container

- [ ] **FE-COMP-111**: Create `GraphPage` component
  - Full-page graph visualization using vertical tree layout
  - Contains: TreeTabBar, GraphTreeView, ExpandedDocView, ResourcePanel
  - Manages graph interaction state (primary node, expanded card, breadcrumb trail)
- [ ] **FE-COMP-112**: Create `TreeTabBar` component
  - Controls: search input, filter panel toggle
  - Primary node selector / reset
  - Export options (PNG, SVG)
  - No zoom controls (two-finger trackpad scrolling instead)
- [ ] **FE-COMP-113**: Create `GraphTreeView` component
  - Main tree rendering area — vertical layout with BFS depth-level rows
  - Virtual scrolling via @tanstack/virtual for performance
  - Props: `nodes`, `edges`, `primaryNodeId`, `onNodeClick`, `onNodeExpand`
  - Two-finger scroll vertical + horizontal (Mac trackpad UX)
  - Renders `TreeRow` components, each containing `NodeCard` components

### 11.2 Graph UI Elements

- [ ] **FE-COMP-114**: Create `NodeCard` component
  - Compressed rectangular box representing a spec in the tree
  - Shows: title, agent-generated summary, status icon, permission indicator
  - States: default, selected, hovered, dimmed, highlighted
  - Click to expand: fills screen with document content
- [ ] **FE-COMP-115**: Create `TreeRow` component
  - A single depth level in the BFS tree layout
  - Contains one or more `NodeCard` components arranged horizontally
  - Supports row merging (custom layout algorithm)
  - Connection lines between parent and child cards across rows
- [ ] **FE-COMP-116**: Create `ExpandedDocView` component
  - Fills screen when a NodeCard is clicked
  - Shows full document content for the selected spec
  - Tree fades out behind the expanded view
  - Connected nodes appear as horizontal scroll cards at bottom (`ConnectedNodesBar`)
  - Breadcrumb trail at top (`BreadcrumbTrail`)
- [ ] **FE-COMP-117**: Create `ConnectedNodesBar` component
  - Horizontal scrollable row of connected node cards at bottom of ExpandedDocView
  - Shows specs connected to the currently expanded spec
  - Click a card to navigate (make it the new primary, re-render tree)
  - Grouped by edge type with colored section headers
- [ ] **FE-COMP-118**: Create `BreadcrumbTrail` component
  - Navigation breadcrumb at top of ExpandedDocView
  - Tracks path of expanded cards through the tree
  - Click any breadcrumb to jump back to that point
  - Shows: spec title for each visited node
- [ ] **FE-COMP-119**: Create `ResourcePanel` component
  - Details panel for selected node/edge
  - Node: full spec metadata, connected edges list, version info
  - Edge: type, source, target, metadata, created info
  - Edit capabilities for selected elements
- [ ] **FE-COMP-120**: Create `GraphFilterPanel` component
  - Sidebar or popover with filter controls
  - Filter by edge type (checkboxes)
  - Filter by author (multi-select)
  - Filter by tag (multi-select)
  - Filter by date range
  - Filter by permission level
  - Show/hide orphan nodes
- [ ] **FE-COMP-121**: Create `GraphSearch` component
  - Search input that highlights matching nodes in the tree
  - Results list with click-to-focus (scrolls tree to matching card)
  - Search by title, content, tag, author
- [ ] **FE-COMP-122**: Create `GraphLegend` component
  - Color/style legend for edge types
  - Legend for node states and permission indicators
  - Toggleable visibility

#### Design Decisions

> **Q**: What shape should graph nodes be? Should they contain text (spec title) or be icon-only with labels below?
> **A**: Rounded rectangles (8px radius) containing the spec title text. Rectangles accommodate varying title lengths better than circles. Node width adapts to title length (min 80px, max 200px, with ellipsis truncation). A small colored dot (6px) in the top-right corner indicates status. No icons — text labels inside the node are more readable.

> **Q**: What is the maximum character count for node labels before truncation?
> **A**: 40 characters. Titles longer than 40 chars are truncated with ellipsis inside the node. The full title appears in a tooltip on hover. This keeps nodes compact while showing enough of the title to be identifiable.

> **Q**: Should nodes show a preview of spec content on hover (tooltip), or require clicking to see details in the sidebar?
> **A**: Hover shows a tooltip with: full title, first 100 characters of content, tag pills, and edge count summary. Click selects the node and shows full details in a sidebar panel (or navigates to the editor, depending on user preference set in settings). Hover preview provides quick scanning without committing to navigation.

> **Q**: Should edges show labels by default, or only on hover?
> **A**: Labels hidden by default, shown on hover over the edge. When a node is selected, all its edges show labels. A toggle in the graph toolbar ("Show edge labels") reveals all labels for users who want the full picture. This keeps the default view clean while making labels accessible.

> **Q**: Should animated edges be used (e.g., flowing dots to indicate direction), or is static styling sufficient?
> **A**: Static styling with arrowheads for direction. Animated edges are visually distracting in a productivity tool and add rendering cost. The arrow size and position clearly indicate direction. Reserve animation for transient states only (e.g., briefly animate a newly created edge to draw attention).

> **Q**: For the "contradicts" edge type, should there be a special visual treatment (red line, warning icon) to make conflicts immediately visible?
> **A**: Yes. `contradicts` edges use a red-orange dashed line (2px) with a small warning triangle icon at the midpoint. This is the only edge type with special treatment — all others use solid lines with type-specific colors. Contradictions are problems that need resolution, so they should visually stand out from the normal graph topology.

> **Q**: Should the graph support multi-selection (click + drag to select area, Ctrl+click for individual)?
> **A**: Yes. Ctrl+Click for individual multi-select, Click+Drag on empty canvas for rectangle selection. Multi-selection actions: batch delete, batch move (drag the group), and "Create edge between" (for exactly 2 selected nodes). No grouping operation in MVP. Selection is indicated by a blue highlight border on selected nodes.

> **Q**: Should double-click on a node open the spec editor, or navigate to the graph subview centered on that node?
> **A**: Double-click opens the spec in the editor (navigates to `/docs/:docId/specs/:specId`). Single-click selects the node and shows details in the sidebar. This follows the convention of "click to select, double-click to open." If the graph is in a split pane with the editor, double-click scrolls the editor to that spec instead of navigating.

> **Q**: Should there be a "graph history" to undo/redo graph navigation (like browser back/forward)?
> **A**: Yes. Maintain a navigation stack of graph viewport states (center position, zoom level, selected node). Back/Forward buttons in the graph toolbar (and `Alt+Left/Right` keyboard shortcuts) traverse this stack. The stack stores the last 20 viewport states. This is essential for exploratory graph navigation where users drill into neighborhoods and want to return.

---

## 12. Version Control Feature Components

### 12.1 Version History

- [ ] **FE-COMP-123**: Create `VersionHistoryPage` component
  - Page showing version history for a spec or document
  - Contains: VersionTimeline, DiffViewer, VersionActions
- [ ] **FE-COMP-124**: Create `VersionTimeline` component
  - Vertical timeline of version entries
  - Each entry: commit hash, author, date, change summary
  - Click to select and view diff
  - Current version highlighted
  - Branch indicators on timeline
- [ ] **FE-COMP-125**: Create `VersionEntry` component
  - Single entry in the version timeline
  - Commit hash (short), author avatar + name, relative timestamp
  - One-line change summary
  - Actions: view diff, revert to this version, view in graph
- [ ] **FE-COMP-126**: Create `VersionCompare` component
  - Side-by-side or inline diff comparison
  - Select "from" and "to" versions via dropdowns
  - (Diff display details in 08-VERSION-CONTROL-UI-PLAN.md)

### 12.2 Branch Management

- [ ] **FE-COMP-127**: Create `BranchSelector` component
  - Dropdown showing available branches
  - Current branch highlighted
  - Create new branch option
  - Search branches by name
  - Show branch status (ahead/behind)
- [ ] **FE-COMP-128**: Create `BranchCreateDialog` component
  - Modal for creating a new branch
  - Fields: branch name, source branch
  - Validation: name format, uniqueness
- [ ] **FE-COMP-129**: Create `MergeDialog` component
  - Modal for merging branches
  - Select source and target branches
  - Pre-merge conflict check display
  - Merge confirmation
- [ ] **FE-COMP-130**: Create `ConflictResolutionPanel` component
  - Panel showing merge conflicts
  - Per-spec conflict display
  - Choose: keep mine, keep theirs, manual merge
  - Preview of resolved state

### 12.3 Diff Components

- [ ] **FE-COMP-131**: Create `DiffViewer` component
  - Light-indication diff display (per PRD: not heavy GitHub-style)
  - Inline view showing unified content
  - Subtle background color tints for added/removed/changed
  - (Detailed specification in 08-VERSION-CONTROL-UI-PLAN.md)
- [ ] **FE-COMP-132**: Create `DiffLine` component
  - Single line in the diff view
  - Light tint: green for added, red for removed, yellow for modified
  - No heavy +/- gutters — clean, document-like appearance
- [ ] **FE-COMP-133**: Create `RevertConfirmDialog` component
  - Confirmation modal for reverting to a previous version
  - Shows what will change (summary of diff)
  - Warning about irreversible action (creates new version)
  - Confirm/cancel buttons

#### Design Decisions

> **Q**: The PRD specifies "light colored indications" for diffs. What exactly does this mean?
> **A**: Combination: a 3px colored margin bar on the left side (green for additions, red for removals, blue for modifications) plus a very subtle background tint (green-50/red-50 at ~5% opacity). The text itself is NOT colored — it remains the standard text color. Removed text uses a light strikethrough. This keeps the content readable (looks "exactly how it was") while subtly indicating changes.

> **Q**: Should the diff view support side-by-side mode (before | after), or only unified inline mode?
> **A**: Both modes available, with unified inline as the default. Side-by-side is toggled via a button in the diff toolbar. In side-by-side mode, the left pane shows the "before" version and the right shows "after," each rendered cleanly as the spec looked at that point, with only the subtle margin bars and tints indicating what changed. This fulfills the PRD's "look exactly how it was" requirement.

> **Q**: Should the diff view support word-level highlighting (changes within a line) or only line-level?
> **A**: Word-level highlighting. When a line is modified (not added/removed entirely), individual changed words within the line get a slightly stronger background tint (10% opacity vs. 5% for the line). This helps users spot precise changes within long paragraphs without scanning the entire line. Use a word-diff algorithm (e.g., `diff-match-patch`) for accurate results.

> **Q**: How prominently should branch information be displayed?
> **A**: Persistent indicator in the app header — a small branch icon + branch name chip next to the project name. Clicking the chip opens a branch switcher dropdown. The indicator is always visible because the current branch affects all content the user sees. It uses a subtle style (muted text, no background) so it doesn't dominate the header.

> **Q**: Should branch creation/switching be accessible from a global dropdown, or only from the version control page?
> **A**: Accessible from both. The header branch chip opens a dropdown for quick switching between existing branches and creating new ones. The version control page provides the full branch management UI (list, delete, compare, merge). The header dropdown is the primary interaction point for day-to-day branch switching.

> **Q**: Should the UI show a visual branch graph (like `gitk` or GitHub's network graph)?
> **A**: Yes, but simplified. Show a vertical branch graph on the version control page with branch lines, merge points, and commit dots. It uses the project's color palette to distinguish branches. Keep it simple — no commit messages on the graph itself (those appear in the adjacent timeline list on click). This provides spatial understanding of branch relationships.

---

## 13. Generative UI Feature Components

- [ ] **FE-COMP-134**: Create `GenUIHostPanel` component
  - Container for displaying a generative UI
  - Iframe wrapper with sandbox controls
  - Loading indicator while gen UI builds/loads
  - Error display if build/load fails
  - Actions: reload, view source, open in new tab
- [ ] **FE-COMP-135**: Create `GenUIBrowser` component
  - List of available generative UIs
  - Filter by: user, linked spec, type (readout, input, example)
  - Card grid showing: name, thumbnail, linked specs, created date
  - Click to load in GenUIHostPanel
- [ ] **FE-COMP-136**: Create `GenUICard` component
  - Card for a generative UI project in the browser
  - Thumbnail/preview, name, description, spec links
  - Status: built, building, error
  - Actions: open, delete, rebuild
- [ ] **FE-COMP-137**: Create `GenUILoadingState` component
  - Displayed while gen UI project is being built or loaded
  - Shows build progress if available
  - Animated builder illustration
- [ ] **FE-COMP-138**: Create `GenUIErrorState` component
  - Displayed when gen UI fails to build or load
  - Error message with details
  - "Retry build" and "Report issue" buttons
- [ ] **FE-COMP-139**: Create `GenUIToolbar` component
  - Controls for the active gen UI
  - Reload, close, send data to agent, fullscreen toggle
  - Link to source spec(s)

#### Design Decisions

> **Q**: What default size should the gen UI iframe be? Full panel width with a set height, or responsive to content?
> **A**: Full panel width with a default height of 400px. The iframe is resizable vertically via a drag handle at the bottom (min 200px, max 800px). Content-responsive sizing is not possible securely across iframe boundaries without `allow-same-origin`. A "Fullscreen" button expands the gen UI to a modal overlay for complex UIs.

> **Q**: Should gen UIs be displayable in multiple contexts (chat message, dedicated panel, modal, full-page)?
> **A**: Three contexts: embedded in a chat message (compact, 300px height), in a dedicated gen UI panel/page (full width, 400px default height), and as a fullscreen modal (for complex interactions). All three use the same iframe component with different size presets. No full-page route for gen UIs — the modal fullscreen is sufficient.

> **Q**: How should gen UI errors (JavaScript errors inside the iframe) be communicated to the user?
> **A**: The gen UI bridge protocol includes an `error` message type. If the gen UI sends an error (or fails to send a `ready` message within 5 seconds), the host replaces the iframe with an error state showing "This component encountered an error" with a "Reload" button and a "Report to agent" button that sends the error details to the agent for diagnosis.

> **Q**: Should there be a dedicated page for browsing gen UIs, or should they only be accessible via the chat and spec editor?
> **A**: Yes, a dedicated gen UI gallery page at `/gen-ui`. It shows all gen UIs in a grid layout with thumbnails, titles, linked spec names, and creation dates. Users can filter by linked document/spec and search by title. This provides discoverability beyond the chat timeline where gen UIs are easily lost.

> **Q**: Should gen UI thumbnails be auto-generated (screenshot), manually uploaded, or generated from the first frame of the UI?
> **A**: Auto-generated via server-side screenshot on build completion. The build pipeline renders the gen UI in a headless browser, captures a 400x300 screenshot, and stores it as the thumbnail. This requires no manual effort and always represents the current state of the gen UI.

---

## 14. Settings Feature Components

- [ ] **FE-COMP-140**: Create `SettingsPage` component
  - Settings view with sidebar navigation
  - Sections: Profile, Appearance, Keyboard Shortcuts, Notifications, Permissions
- [ ] **FE-COMP-141**: Create `ProfileSettings` component
  - Edit: display name, email, avatar
  - Change password
  - View API keys (if applicable)
- [ ] **FE-COMP-142**: Create `AppearanceSettings` component
  - Theme selector: light, dark, system
  - Font size adjustment
  - Chat panel default width
  - Sidebar default state (open/collapsed)
  - Animation toggle (respect reduced motion)
- [ ] **FE-COMP-143**: Create `ShortcutSettings` component
  - List all keyboard shortcuts
  - Customizable keybindings
  - Reset to defaults
  - Search shortcuts
- [ ] **FE-COMP-144**: Create `NotificationSettings` component
  - Toggle notifications by type
  - Sound preferences
  - Email notification preferences (if applicable)
- [ ] **FE-COMP-145**: Create `PermissionManagement` component
  - View specs you have shared / been granted access to
  - Manage access grants per spec
  - View access audit log

---

## 15. Component Patterns & Conventions

### 15.1 Component File Structure

- [ ] **FE-COMP-146**: Define component file convention
  ```
  ComponentName/
  ├── ComponentName.tsx       # Component implementation
  ├── ComponentName.scss      # BEM styles
  ├── ComponentName.test.tsx  # Tests
  ├── ComponentName.types.ts  # TypeScript interfaces (if complex)
  └── index.ts                # Barrel export
  ```
  OR for simple components:
  ```
  ComponentName.tsx
  ComponentName.scss
  ```

### 15.2 Props Conventions

- [ ] **FE-COMP-147**: Define standard prop patterns
  - All components accept `className` for style overrides
  - All interactive components accept `disabled`
  - All components with content accept `children` or specific content props
  - Use `on` prefix for event handlers (`onClick`, `onChange`, `onClose`)
  - Use discriminated unions for variant props
- [ ] **FE-COMP-148**: Define ref forwarding convention
  - All common components forward refs using `React.forwardRef`
  - Allow consumers to access underlying DOM elements

### 15.3 Composition Patterns

- [ ] **FE-COMP-149**: Define compound component pattern for complex components
  - `Modal` → `Modal.Header`, `Modal.Body`, `Modal.Footer`
  - `DropdownMenu` → `DropdownMenu.Item`, `DropdownMenu.Separator`
  - Use React context for implicit parent-child communication
- [ ] **FE-COMP-150**: Define render prop pattern for customizable rendering
  - List components accept `renderItem` for custom item rendering
  - Graph components accept render functions for custom node/edge rendering
- [ ] **FE-COMP-151**: Define HOC (Higher-Order Component) usage
  - `withErrorBoundary(Component)` — wrap any component with error boundary
  - `withPermission(Component, requiredLevel)` — gate rendering on permission
  - Prefer hooks over HOCs where possible

### 15.4 State Management in Components

- [ ] **FE-COMP-152**: Define local vs. global state guidelines
  - Local state: UI-only state (open/closed, hover, form input values)
  - Global state (MobX stores): application-level state that persists across navigations or is shared across the application. Three store categories: **Domain stores** (backend data, API actions), **Session stores** (auth, user profile, browser state), **UI stores** (`@computed` domain transformations for UI-ready data, plus application-level state like theme and layout preferences). Stores are class-based with `makeObservable` and explicit decorators (`@observable`, `@action`, `@computed`), provided via RootStore pattern + React Context.
  - **CRITICAL**: Primitive and compositional UI components must be **props-driven**. Stores are consumed by top-level `observer()` container components that pass data down as props. Leaf components should never import stores directly — they receive all data via props. Simple UI state (open/closed, hover, focus, form inputs, animation) is local component state, never store state.
  - URL state: current resource identifier, view mode, filters
- [ ] **FE-COMP-153**: Define loading state convention
  - Every component that fetches data must handle: loading, error, empty, populated states
  - Use skeleton loaders for content areas, spinners for action feedback
  - Never show a blank screen — always show feedback

#### Design Decisions

> **Q**: How many common components should be built upfront in Phase 1 vs. built as needed?
> **A**: Build a core set of ~12 components upfront in Phase 1: Button, IconButton, Input, TextArea, Select, Checkbox, Badge, Spinner, Toast, Dialog (Modal), Tooltip, and Dropdown Menu. All others (Tabs, Accordion, Table, Popover, etc.) are built on-demand as features require them. The core set covers 80% of use cases and establishes design patterns for the rest.

> **Q**: Should the component library be extractable as a separate package (`@kg/ui`) for potential reuse in generative UI projects, or should it remain in the client source?
> **A**: Keep it in `client/ui/src/components/shared/` for now. Extracting to a package adds build pipeline complexity (versioning, publishing, dependency management) with no immediate benefit. Gen UI projects run in isolated iframes with their own styles — they won't share the host component library. If reuse demand emerges later, extraction is a straightforward refactor.

> **Q**: Should every common component have a documented accessibility specification (ARIA roles, keyboard behavior, screen reader text)?
> **A**: Yes. Each shared component's Storybook story includes an "Accessibility" section documenting: ARIA roles and attributes, keyboard interaction pattern, and screen reader behavior. Radix UI primitives handle most ARIA concerns automatically, but the documentation ensures wrapper components don't break accessibility. This also serves as a reference for feature developers.

> **Q**: Should components fail lint/build if required accessibility props (like `aria-label` on IconButton) are missing?
> **A**: Yes. Use `eslint-plugin-jsx-a11y` with strict rules. `IconButton` and `Icon` components require an `aria-label` prop (enforced via TypeScript — the prop is required in the type definition). The ESLint rule `jsx-a11y/aria-props` and `jsx-a11y/role-has-required-aria-props` run in CI and fail the build on violations.

> **Q**: Should there be automated accessibility tests for each component?
> **A**: Yes. Every shared component's test file includes a `jest-axe` accessibility check that renders all variants and asserts no violations. This runs as part of the standard `vitest` test suite. Storybook also integrates the `@storybook/addon-a11y` addon for real-time accessibility feedback during development.

> **Q**: Should the project use Storybook for component development and documentation?
> **A**: Yes, use Storybook. The benefits outweigh the dev time cost: isolated component development, living documentation, visual regression baseline, and accessibility testing. Configure Storybook with Vite builder for fast startup. Only shared components require stories — feature-specific components do not.

> **Q**: If not Storybook, should there be a component gallery page within the app (dev-only route)?
> **A**: N/A — Storybook is the chosen approach. No in-app gallery needed. Storybook runs as a separate dev server (`bun run storybook`) and can be deployed as a static site for team reference.

> **Q**: Should components have prop documentation (JSDoc comments on props interfaces), or rely on TypeScript types as documentation?
> **A**: TypeScript types are the primary documentation. Add JSDoc comments only for non-obvious props (e.g., explaining what `variant="ghost"` looks like, or documenting side effects of `onOpenChange`). Don't add JSDoc for self-explanatory props like `disabled`, `className`, or `children`. Storybook's auto-generated prop tables from TypeScript types provide the searchable reference.

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Common Components | 23 (FE-COMP-001 through FE-COMP-023) |
| 2. Layout Components | 14 (FE-COMP-024 through FE-COMP-037) |
| 3. Feedback Components | 12 (FE-COMP-038 through FE-COMP-049) |
| 4. Data Display Components | 9 (FE-COMP-050 through FE-COMP-058) |
| 5. Navigation Components | 6 (FE-COMP-059 through FE-COMP-064) |
| 6. Form Components | 8 (FE-COMP-065 through FE-COMP-072) |
| 7. Auth Feature Components | 3 (FE-COMP-073 through FE-COMP-075) |
| 8. Dashboard Feature Components | 6 (FE-COMP-076 through FE-COMP-081) |
| 9. Document & Spec Feature Components | 15 (FE-COMP-082 through FE-COMP-096) |
| 10. Chat Dialog Feature Components | 14 (FE-COMP-097 through FE-COMP-110) |
| 11. Graph Visualization Feature Components | 12 (FE-COMP-111 through FE-COMP-122) |
| 12. Version Control Feature Components | 11 (FE-COMP-123 through FE-COMP-133) |
| 13. Generative UI Feature Components | 6 (FE-COMP-134 through FE-COMP-139) |
| 14. Settings Feature Components | 6 (FE-COMP-140 through FE-COMP-145) |
| 15. Component Patterns & Conventions | 8 (FE-COMP-146 through FE-COMP-153) |
| **TOTAL** | **153** |

> Note: Many components listed here contain multiple sub-tasks in their
> descriptions (states, variants, accessibility). The true implementation
> effort per component often spans 3-5 discrete tasks, pushing the effective
> total well above 200.

### Dependencies

Completion of this plan enables all feature-specific frontend plans to proceed
with implementation since they reference components defined here.

### Definition of Done

This plan is complete when:
- [ ] All common components are implemented and render in all states
- [ ] Layout shell works at all breakpoints
- [ ] Every component has BEM-compliant SCSS
- [ ] Every component has accessible markup (ARIA, keyboard navigation)
- [ ] Every component handles loading, error, empty, populated states
- [ ] Feature container components use `observer()` and pass store data as props to child components
- [ ] Primitive and compositional components are purely props-driven with no store imports (domain/session/UI) via `observer()` and RootStore context
- [ ] Component documentation or Storybook entries exist for shared components
