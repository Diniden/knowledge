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
