---
paths: src/utils/codeGenerator.ts
---

# Code Generation Rules

## CRITICAL: Exported Code Props

Only export props that exist on the actual React/WordPress component:

- ✅ **Real component props**: `variant`, `text`, `icon`, `onClick`, etc.
- ✅ **Inline styles for layout**: `style={{ gridColumn: 'span 6' }}` for grid positioning
- ❌ **Editor-only props**: `gridGuideColor`, `gridColumnSpan`, `gridRowSpan` (converted to inline styles)
- ❌ **Internal props**: `content`, `placeholder`, `children` (handled separately)
- ❌ **Magic props**: Any prop that doesn't exist on the WordPress component API

**Rationale**: Generated code must be clean, production-ready React/JSX that uses only real component APIs. Layout properties (grid positioning, flex behavior) are converted to inline `style` props. Editor visualization properties are stripped out entirely.

## Grid Layout Conversion

Grid child properties are converted to CSS Grid inline styles:

```typescript
// Editor representation
<Card gridColumnSpan={6} gridRowSpan={2}>

// Generated code
<Card style={{ gridColumn: 'span 6', gridRow: 'span 2' }}>
```

## camelCase Preservation

All JSX prop names must remain in camelCase:

```typescript
// ✅ Correct
<Button backgroundColor="#000" />

// ❌ Wrong
<Button backgroundcolor="#000" />
```

## Width Control

Layout containers (VStack, HStack, Grid, Card) may have a `width` prop in the editor that controls their constraint behavior:

```typescript
// Editor: node.width = 'content' or 'full'
// Generated: style={{ maxWidth: '1344px' }} or style={{ width: '100%' }}
```

## Component Names

Component names (set via `node.name`) are automatically included in exported code:

```typescript
// Unique names → id attribute
<Card id="hero-section">

// Duplicate names → className attribute
<Card className="pricing-card">
<Card className="pricing-card">
```

**Name Sanitization**:
- Convert to lowercase
- Replace spaces and special chars with hyphens
- Remove leading/trailing hyphens
- Collapse multiple hyphens

## Interaction Handlers

When `includeInteractions: true`, generate handler functions for navigation and modal interactions:

```typescript
const handleClick_node123 = () => {
  // Navigate to page or show modal
};

<Button onClick={handleClick_node123} />
```
