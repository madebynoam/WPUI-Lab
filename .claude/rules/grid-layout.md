---
paths: "{src/components/RenderNode.tsx,src/components/PropertiesPanel.tsx,src/components/GridResizeHandles.tsx}"
---

# Grid-First Layout System Rules

## Core Principle

WP-Designer uses a **grid-first** layout system where Grid is the primary layout mechanism, with VStack/HStack for content grouping only.

## Layout Hierarchy

```
Grid (12 columns)
  ├─ VStack/HStack (content grouping)
  │   └─ Components (Fill or Hug width)
  └─ Components (gridColumnSpan controls width)
```

## Grid Children

Grid children use `gridColumnSpan` and `gridRowSpan` props (editor-only):

```typescript
// Editor representation
<Card gridColumnSpan={6} gridRowSpan={1}>

// Rendered as (RenderNode.tsx)
<div style={{ gridColumn: 'span 6', gridRow: 'span 1' }}>
  <Card>
```

### Width Presets

```typescript
gridColumnSpan: 12  // Full width
gridColumnSpan: 9   // 75%
gridColumnSpan: 8   // 66%
gridColumnSpan: 6   // 50%
gridColumnSpan: 4   // 33%
gridColumnSpan: 3   // 25%
```

## VStack/HStack (Content Grouping Only)

VStack and HStack are for grouping content, NOT for width control:

- **Purpose**: Group related elements with spacing/alignment
- **Width**: VStack/HStack children use Hug/Fill (not gridColumnSpan)
- **No resize handles**: VStack/HStack don't have drag handles
- **Grid positioning**: When inside Grid, the VStack/HStack itself uses gridColumnSpan

### VStack/HStack Children Width

Children of VStack/HStack use `node.width`:

```typescript
// Fill (default): Stretch to fill container
node.width = 'fill'
// Rendered: style={{ alignSelf: 'stretch', width: '100%' }}

// Hug: Shrink to content size
node.width = 'hug'
// Rendered: style={{ alignSelf: 'flex-start', width: 'fit-content' }}
```

**IMPORTANT**: `width` is stored at `node.width`, NOT `node.props.width` (per ComponentTreeReducer).

## Root Grid

Every page has a root Grid (`ROOT_GRID_ID`):

- Always 100% width (no maxWidth constraint)
- Cannot be deleted
- Default: 12 columns, spacing multiplier of 6 (24px gap)
- See `src/utils/treeHelpers.ts` for `ROOT_GRID_ID` constant

## Grid Lines Visualization

Grid components can show grid lines for easier layout:

- Toggle per Grid: Click "Show Grid Lines" in Properties Panel
- Toggle all Grids: `Ctrl+G` keyboard shortcut
- Visual overlay: Blue dashed lines at column boundaries
- Editor-only: Not visible in Play Mode or exported code
- Color customizable via `gridGuideColor` prop (default: `#3858e9`)

**CRITICAL**: `gridGuideColor` is editor-only and must be filtered from exported code.

## Grid Resize Handles

Grid children show resize handles in Design Mode:

- **Right handle**: Drag to change `gridColumnSpan` (keep left edge fixed)
- **Left handle**: Temporarily disabled
- Only visible when component is selected
- Smart history consolidation: Multiple drag updates → single undo entry
- Collision detection: Prevent resizing into siblings

See `src/components/GridResizeHandles.tsx` for implementation.

## Layout Controls (Figma-style)

VStack/HStack use Figma terminology:

### Resizing Behavior
- **Hug** (default): Container shrinks to fit content
- **Fill**: Container expands to fill available space

### Alignment
- **Primary axis**: Direction of stack (vertical for VStack, horizontal for HStack)
- **Cross axis**: Perpendicular to stack direction
- Use CSS values for alignment: `'flex-start'`, `'flex-end'`, `'center'`, `'stretch'`, `'space-between'`

### Spacing
- **Gap**: Space between children (8px, 16px presets)
- **Padding**: Internal padding of container

See `src/components/LayoutControls.tsx` and `src/utils/layoutMappings.ts` for UI components.

## Height Controls

Grid containers and children have proper height controls:

### Grid Container Height
- **Auto** (default): Height grows with content
- **Full**: `minHeight: '100vh'` (full viewport height)
- **Custom**: User-defined value (e.g., "500px", "50vh")

UI: Grid Settings panel → Height control with Auto/Full/Custom buttons

### Grid Child Height
- **Auto** (default): Height based on content
- **Fill**: `height: '100%'` (fill Grid row height)
- **Custom**: User-defined value (e.g., "300px", "100%")

UI: Grid Layout panel → Height control with Auto/Fill/Custom buttons

**Implementation**:
- Props stored: `minHeight`, `customMinHeight` (Grid), `height`, `customHeight` (Grid children)
- Converted to inline styles in RenderNode.tsx
- Filtered from exported code and converted to inline styles in codeGenerator.ts

## Properties Panel

Grid-specific properties are HIDDEN from the Settings panel:

```typescript
const gridLayoutProps = [
  'gridColumnSpan', 'gridRowSpan',      // Grid child props
  'columns', 'rows',                     // Grid dimensions
  'gap', 'rowGap', 'columnGap',         // Spacing
  'templateColumns', 'templateRows',    // CSS Grid templates
  'align', 'justify',                    // Grid alignment
  'isInline'                             // Grid display mode
];
```

These are low-level implementation details and should not be exposed in the UI.

## Grouping/Ungrouping

- **Cmd+G**: Group selected components into VStack/HStack
  - Preserves `gridColumnSpan` from first selected item
  - Removes `gridColumnSpan` from children (now inside container)

- **Cmd+Shift+G**: Ungroup VStack/HStack
  - Restores `gridColumnSpan` to children if parent is Grid
  - Extracts children back to parent container

## Common Pitfalls

❌ **Don't** use `gridColumnSpan` on VStack/HStack children
✅ **Do** use `node.width` ('fill' or 'hug') for VStack/HStack children

❌ **Don't** expose low-level Grid props in UI
✅ **Do** use width presets and visual resize handles

❌ **Don't** include `gridGuideColor` in exported code
✅ **Do** filter it out in code generator

❌ **Don't** store width at `node.props.width`
✅ **Do** store width at `node.width` (top-level node property)
