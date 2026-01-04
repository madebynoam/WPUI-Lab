# WP-Designer (WPUI-Lab)

A visual UI builder for creating WordPress-style interfaces with AI assistance.

## Overview

WP-Designer is a sophisticated visual builder that lets you create WordPress component-based UIs through an intuitive drag-and-drop interface, enhanced with AI-powered design assistance. The application uses a tree-based architecture where all UI elements are represented as `ComponentNode` objects, managed through a Redux-style reducer pattern with full undo/redo support.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe development
- **WordPress Components** - 27+ UI components from `@wordpress/components`
- **AI Agents** - Claude Sonnet 4.5 & GPT-5-Mini for intelligent design assistance
- **@dnd-kit** - Drag and drop functionality
- **@automattic/agenttic-ui** - AI chat interface

## Features

### Visual Design
- **Drag & Drop Interface** - Figma-style component manipulation
- **Component Library** - 27+ WordPress components (Buttons, Cards, DataViews, Forms, etc.)
- **Live Preview** - Real-time rendering with Play Mode for testing interactions
- **Multi-Page Projects** - Organize designs across multiple pages
- **Theme Customization** - Per-project color themes and layout settings

### AI-Powered Design
- **Natural Language UI Generation** - Describe your UI and let AI build it
- **Component Suggestions** - AI recommends appropriate components
- **Smart Layouts** - Auto-generate complex layouts (dashboards, forms, tables)
- **Code Generation** - Export designs as React JSX code

### Developer Experience
- **Undo/Redo** - Full history with 50 state snapshots
- **Component Tree** - Hierarchical view of your UI structure
- **Properties Panel** - Fine-tune component props with visual controls
- **Pre-built Patterns** - Jump-start designs with ready-made UI patterns

## Getting Started

### Prerequisites

- Node.js 18+ (22.14.0 recommended)
- npm 10+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd WPUI-Lab

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys to .env.local:
# ANTHROPIC_API_KEY=your-key-here
# OPENAI_API_KEY=your-key-here
```

### Development

```bash
# Start the development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Build

```bash
# Create a production build
npm run build

# Start the production server
npm run start
```

### Linting

```bash
# Run ESLint
npm run lint
```

## Project Structure

```
/app                    # Next.js App Router
  /page.tsx            # Projects list (root route)
  /editor/             # Visual editor routes
  /play/               # Preview mode routes
  /api/chat/           # AI agent API endpoint
  /ClientProviders.tsx # Client-side providers

/src                    # Core application code
  /components/         # React components (Editor, Canvas, Panels, etc.)
  /agent/              # AI agent system and tools
  /utils/              # Helper functions and utilities
  /patterns/           # Pre-built UI patterns
  componentRegistry.tsx # Component definitions
  ComponentTreeContext.tsx # Global state management
  ComponentTreeReducer.ts  # State mutations
```

## Architecture

WP-Designer uses a tree-based architecture:

- **Projects** contain **Pages** contain **ComponentNode Trees**
- Every page has a root 12-column `Grid` component
- State flows through `ComponentTreeContext` → Reducer → Cloud Storage
- AI Agent manipulates trees via registered tools

For detailed architecture documentation, see:
- [`CLAUDE.md`](./CLAUDE.md) - Complete architecture guide
- [`WP-COMPONENT-LOADING.md`](./WP-COMPONENT-LOADING.md) - WordPress integration details
- [`docs/AGENT_ARCHITECTURE.md`](./docs/AGENT_ARCHITECTURE.md) - AI agent system design

## Key Concepts

### ComponentNode
The fundamental data structure representing a UI element:

```typescript
{
  id: "node-1234-abcd",
  type: "Button",
  props: { variant: "primary", text: "Click Me" },
  children: [],
  interactions: [{ trigger: "onClick", action: "navigate", targetId: "page-2" }]
}
```

### Design Mode vs Play Mode
- **Design Mode**: Figma-style editing with selection, drag & drop, and property editing
- **Play Mode**: Interactive preview where components are fully functional

### AI Agent Tools
The AI uses specialized tools to manipulate the component tree:
- `buildFromMarkup` - Create components from JSX-like syntax
- `component_update` - Modify component properties
- `table_create` - Generate DataViews tables
- `section_create` - Build common UI sections (hero, pricing, etc.)

## Development Workflow

1. **Create a Project** - Start with a blank canvas or demo project
2. **Add Components** - Drag from inserter or ask AI to build layouts
3. **Customize** - Edit props in the properties panel
4. **Test** - Switch to Play Mode to interact with your design
5. **Export** - Generate React code from the Code Panel

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# .env.local

# Storage Provider (required)
# Choose one: local, jsonbin, supabase
STORAGE_PROVIDER=local

# AI Features (required for AI-powered design)
ANTHROPIC_API_KEY=sk-ant-...  # For Claude Sonnet 4.5
OPENAI_API_KEY=sk-proj-...    # For GPT-5-Mini

# Team Authentication
TEAM_PASSWORD=your_shared_password

# JSONBin (if STORAGE_PROVIDER=jsonbin)
JSONBIN_API_KEY=your_master_key
JSONBIN_COLLECTION_ID=your_collection_id

# Supabase (if STORAGE_PROVIDER=supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

## Storage Providers

Projects are stored in the cloud. Choose a provider based on your needs:

| Provider | Setup | Best For |
|----------|-------|----------|
| `local` | None | Local dev/testing |
| `jsonbin` | API key from jsonbin.io | Quick prototypes |
| `supabase` | Project + run `supabase/schema.sql` | Production |

### Local Storage
No setup required. Data persists in browser localStorage.

### Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Copy URL and service key to `.env.local`

## Contributing

This is a research/experimental project. Contributions, issues, and feature requests are welcome!

## License

[Add your license here]

## Acknowledgments

- Built with [WordPress Components](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-components/)
- AI powered by [Anthropic Claude](https://www.anthropic.com/) and [OpenAI](https://openai.com/)
- UI framework by [Automattic](https://automattic.com/)
