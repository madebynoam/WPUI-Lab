# Cloud Save MVP with JSONBin (Simplified)

## Overview

Cloud-first persistence for WP-Designer using JSONBin. No local projects - cloud is the source of truth. localStorage is just a working buffer for the current editing session. Each user sees only their own projects.

## Core Principles

```
JSONBin = source of truth (all projects live here)
localStorage = working buffer (unsaved changes only)
My projects only = no team sharing (avoids multi-user conflicts)
/analytics = hidden admin route (shows all usage, not linked in UI)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│                                                                 │
│  User opens app → middleware checks cookie → /auth if needed    │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ /projects page                                           │   │
│  │ - Lists only YOUR projects (filtered by email)           │   │
│  │ - "New Project" button                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ /editor                                                  │   │
│  │ - Loads project from JSONBin on open                     │   │
│  │ - Auto-saves to localStorage while editing (buffer)      │   │
│  │ - "Save" button → saves to JSONBin                       │   │
│  │ - Close without saving → warning + lose changes          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ JSONBin (cloud storage)                                  │   │
│  │ - 1 bin per project                                      │   │
│  │ - Meta: ownerEmail, lastSaved, saveCount                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ /analytics (hidden route - not linked in UI)             │   │
│  │ - Visit manually to see ALL usage across all users       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## User Flows

### First Visit
```
Open app → /auth (email + team password) → /projects (your projects)
```

### Create New Project
```
/projects → "New Project" → enter name → creates bin → opens /editor
```

### Edit Project
```
/projects → click project → /editor loads from JSONBin
  → edit (auto-saves to localStorage buffer)
  → click "Save" → saves to JSONBin
  → button shows "Saved"
```

### Close Without Saving
```
Edit → try to close tab → browser warning "You have unsaved changes"
  → Leave anyway → changes lost
  → Cancel → stay and save
```

### View Analytics (Admin)
```
Manually visit /analytics → see all users, all projects, all saves
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `.env.local` | Modify | JSONBin + password vars |
| `middleware.ts` | Create | Protect all routes |
| `app/auth/page.tsx` | Create | Email + password login |
| `app/api/auth/route.ts` | Create | Set auth cookie |
| `app/api/auth/me/route.ts` | Create | Get current user |
| `app/api/projects/route.ts` | Create | GET list (filtered), POST create |
| `app/api/projects/[binId]/route.ts` | Create | GET, PUT, DELETE |
| `src/components/ProjectsScreen.tsx` | Rewrite | My cloud projects only |
| `src/components/TopBar.tsx` | Modify | Save button |
| `src/components/Editor.tsx` | Modify | Cloud load + beforeunload |
| `src/hooks/useCloudProject.ts` | Create | Cloud operations |
| `src/hooks/useAuth.ts` | Create | Get current user |
| `app/analytics/page.tsx` | Create | Hidden stats page |
| `app/api/analytics/route.ts` | Create | Aggregate all usage |

---

## Implementation

### Step 1: Environment Variables

**File: `.env.local`**
```bash
JSONBIN_API_KEY=<your-master-key>
JSONBIN_COLLECTION_ID=<your-collection-id>
TEAM_PASSWORD=<shared-password>
```

### Step 2: Middleware

**File: `middleware.ts`**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === '/auth' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('wp-designer-auth');

  if (!authCookie?.value) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const returnTo = pathname + request.nextUrl.search;
    return NextResponse.redirect(
      new URL(`/auth?returnTo=${encodeURIComponent(returnTo)}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Step 3: Auth Page

**File: `app/auth/page.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  __experimentalHeading as Heading,
  __experimentalHStack as HStack,
  __experimentalVStack as VStack,
  __experimentalText as Text,
  TextControl,
} from '@wordpress/components';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push(returnTo);
    } else {
      setError('Invalid password');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: 24,
      }}
    >
      <Card size="medium" style={{ gridColumn: '5 / span 4' }}>
        <CardHeader isBorderless={false}>
          <Heading level={5}>Login to WP-Designer</Heading>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <TextControl
                label="Email"
                type="email"
                value={email}
                onChange={(value) => setEmail(value)}
                required
              />
              <TextControl
                label="Team Password"
                type="password"
                value={password}
                onChange={(value) => setPassword(value)}
                required
              />
              {error && (
                <Text style={{ color: '#cc1818' }}>{error}</Text>
              )}
              <HStack spacing={2} justify="flex-end" alignment="center">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </HStack>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
```

### Step 4: Auth API

**File: `app/api/auth/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email?.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  if (password !== process.env.TEAM_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  cookies().set('wp-designer-auth', JSON.stringify({ email }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return NextResponse.json({ success: true, email });
}

export async function DELETE() {
  cookies().delete('wp-designer-auth');
  return NextResponse.json({ success: true });
}
```

**File: `app/api/auth/me/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const authCookie = cookies().get('wp-designer-auth');
  if (!authCookie?.value) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { email } = JSON.parse(authCookie.value);
  return NextResponse.json({ email });
}
```

### Step 5: Projects API

**File: `app/api/projects/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JSONBIN_API = 'https://api.jsonbin.io/v3';

function getCurrentEmail() {
  const authCookie = cookies().get('wp-designer-auth');
  if (!authCookie?.value) return null;
  return JSON.parse(authCookie.value).email;
}

// GET - List MY projects only
export async function GET() {
  const email = getCurrentEmail();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${JSONBIN_API}/c/${process.env.JSONBIN_COLLECTION_ID}/bins`,
      { headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY! } }
    );
    const bins = await res.json();

    // Filter to only this user's projects
    const myProjects = bins.filter((b: any) => b.record?.meta?.ownerEmail === email);

    return NextResponse.json(myProjects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}

// POST - Create new project
export async function POST(request: Request) {
  const email = getCurrentEmail();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();

  const payload = {
    project: {
      id: `project-${Date.now()}`,
      name,
      pages: [{ id: 'page-1', name: 'Home', tree: [] }],
      currentPageId: 'page-1',
    },
    meta: {
      ownerEmail: email,
      createdAt: Date.now(),
      lastSaved: Date.now(),
      saveCount: 1,
    },
  };

  try {
    const res = await fetch(`${JSONBIN_API}/b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': process.env.JSONBIN_API_KEY!,
        'X-Collection-Id': process.env.JSONBIN_COLLECTION_ID!,
        'X-Bin-Name': `${email}-${name}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return NextResponse.json({ binId: data.metadata.id, ...payload });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
```

**File: `app/api/projects/[binId]/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JSONBIN_API = 'https://api.jsonbin.io/v3';

function getCurrentEmail() {
  const authCookie = cookies().get('wp-designer-auth');
  if (!authCookie?.value) return null;
  return JSON.parse(authCookie.value).email;
}

// GET - Load project
export async function GET(
  request: Request,
  { params }: { params: { binId: string } }
) {
  try {
    const res = await fetch(`${JSONBIN_API}/b/${params.binId}/latest`, {
      headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY! },
    });
    const data = await res.json();
    return NextResponse.json({ binId: params.binId, ...data.record });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load project' }, { status: 500 });
  }
}

// PUT - Save project
export async function PUT(
  request: Request,
  { params }: { params: { binId: string } }
) {
  const email = getCurrentEmail();
  const { project, meta } = await request.json();

  const payload = {
    project,
    meta: {
      ...meta,
      lastSaved: Date.now(),
      lastSavedBy: email,
      saveCount: (meta.saveCount || 0) + 1,
    },
  };

  try {
    await fetch(`${JSONBIN_API}/b/${params.binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': process.env.JSONBIN_API_KEY!,
      },
      body: JSON.stringify(payload),
    });
    return NextResponse.json({ success: true, ...payload.meta });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// DELETE - Delete project
export async function DELETE(
  request: Request,
  { params }: { params: { binId: string } }
) {
  try {
    await fetch(`${JSONBIN_API}/b/${params.binId}`, {
      method: 'DELETE',
      headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY! },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
```

### Step 6: Hooks

**File: `src/hooks/useAuth.ts`**
```typescript
import { useState, useEffect } from 'react';

export function useAuth() {
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setEmail(data?.email || null);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return { email, isLoading };
}
```

**File: `src/hooks/useCloudProject.ts`**
```typescript
import { useState, useCallback } from 'react';

export function useCloudProject() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      return await res.json();
    } catch {
      setError('Failed to list projects');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return await res.json();
    } catch {
      setError('Failed to create project');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProject = useCallback(async (binId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${binId}`);
      return await res.json();
    } catch {
      setError('Failed to load project');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProject = useCallback(async (binId: string, project: any, meta: any) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${binId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, meta }),
      });
      return await res.json();
    } catch {
      setError('Failed to save');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deleteProject = useCallback(async (binId: string) => {
    try {
      await fetch(`/api/projects/${binId}`, { method: 'DELETE' });
      return true;
    } catch {
      setError('Failed to delete');
      return false;
    }
  }, []);

  return {
    isLoading,
    isSaving,
    error,
    listProjects,
    createProject,
    loadProject,
    saveProject,
    deleteProject,
  };
}
```

### Step 7: ProjectsScreen (My Projects Only)

**File: `src/components/ProjectsScreen.tsx`** - Rewrite
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCloudProject } from '@/hooks/useCloudProject';
import {
  __experimentalVStack as VStack,
  __experimentalHStack as HStack,
  __experimentalHeading as Heading,
  __experimentalText as Text,
  Button,
  Card,
  CardBody,
  Icon,
  DropdownMenu,
  MenuGroup,
  MenuItem,
} from '@wordpress/components';
import { moreVertical, trash, plus, pages } from '@wordpress/icons';

interface CloudProject {
  binId: string;
  name: string;
  lastSaved: number;
}

export function ProjectsScreen() {
  const router = useRouter();
  const { listProjects, createProject, deleteProject, isLoading } = useCloudProject();
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [newName, setNewName] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    listProjects().then(data => {
      const mapped = (data || []).map((b: any) => ({
        binId: b.record?.binId || b.metadata?.id,
        name: b.record?.project?.name || 'Untitled',
        lastSaved: b.record?.meta?.lastSaved || Date.now(),
      }));
      setProjects(mapped);
    });
  }, [listProjects]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await createProject(newName.trim());
    if (result?.binId) {
      router.push(`/editor?cloud=${result.binId}`);
    }
    setShowModal(false);
    setNewName('');
  };

  const handleOpen = (binId: string) => {
    router.push(`/editor?cloud=${binId}`);
  };

  const handleDelete = async (binId: string, name: string) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      await deleteProject(binId);
      setProjects(projects.filter(p => p.binId !== binId));
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <VStack spacing={12} style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <HStack spacing={2}>
          <Heading level={4}>Your projects</Heading>
          <Button variant="secondary" icon={plus} size="compact" onClick={() => setShowModal(true)}>
            New project
          </Button>
        </HStack>

        {isLoading && <Text>Loading...</Text>}

        {projects.map(project => (
          <Card key={project.binId} size="medium">
            <CardBody size="small">
              <HStack spacing={6} style={{ justifyContent: 'space-between', cursor: 'pointer' }}>
                <HStack spacing={2} onClick={() => handleOpen(project.binId)} style={{ flex: 1 }}>
                  <Icon icon={pages} size={24} />
                  <VStack spacing={1}>
                    <Heading level={4} style={{ margin: 0 }}>{project.name}</Heading>
                    <Text variant="muted">Last saved {formatDate(project.lastSaved)}</Text>
                  </VStack>
                </HStack>
                <div onClick={e => e.stopPropagation()}>
                  <DropdownMenu icon={moreVertical} label="Actions">
                    {({ onClose }) => (
                      <MenuGroup>
                        <MenuItem
                          icon={trash}
                          isDestructive
                          onClick={() => {
                            handleDelete(project.binId, project.name);
                            onClose();
                          }}
                        >
                          Delete
                        </MenuItem>
                      </MenuGroup>
                    )}
                  </DropdownMenu>
                </div>
              </HStack>
            </CardBody>
          </Card>
        ))}

        {!isLoading && projects.length === 0 && (
          <Card size="medium">
            <CardBody style={{ textAlign: 'center', padding: 60 }}>
              <Text variant="muted">No projects yet. Create your first one!</Text>
            </CardBody>
          </Card>
        )}
      </VStack>

      {/* New Project Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card size="medium" style={{ width: 400 }}>
            <CardBody>
              <VStack spacing={4}>
                <Heading level={4}>New Project</Heading>
                <input
                  placeholder="Project name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                  style={{ width: '100%', padding: 8 }}
                />
                <HStack spacing={2} style={{ justifyContent: 'flex-end' }}>
                  <Button onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button variant="primary" onClick={handleCreate}>Create</Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
```

### Step 8: Editor Changes

**File: `src/components/Editor.tsx`** - Add these pieces:
```typescript
// State for cloud
const [cloudBinId, setCloudBinId] = useState<string | null>(null);
const [cloudMeta, setCloudMeta] = useState<any>(null);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [initialLoadDone, setInitialLoadDone] = useState(false);

const { loadProject, saveProject, isSaving } = useCloudProject();

// Load from cloud on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const binId = params.get('cloud');
  if (binId) {
    setCloudBinId(binId);
    loadProject(binId).then(data => {
      if (data?.project) {
        // Load into your existing state management
        setProject(data.project);
        setCloudMeta(data.meta);
        setInitialLoadDone(true);
      }
    });
  }
}, []);

// Track changes after initial load
useEffect(() => {
  if (initialLoadDone) {
    setHasUnsavedChanges(true);
  }
}, [project]);

// Warn before close
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [hasUnsavedChanges]);

// Save handler - pass to TopBar
const handleSave = async () => {
  if (!cloudBinId) return;
  const result = await saveProject(cloudBinId, project, cloudMeta);
  if (result) {
    setCloudMeta({ ...cloudMeta, ...result });
    setHasUnsavedChanges(false);
  }
};
```

### Step 9: TopBar Save Button

**File: `src/components/TopBar.tsx`** - Add Save button
```typescript
// Props: hasUnsavedChanges, isSaving, onSave, cloudBinId

<Button
  onClick={onSave}
  disabled={isSaving || !cloudBinId}
  variant={hasUnsavedChanges ? "primary" : "secondary"}
>
  {isSaving ? "Saving..." : hasUnsavedChanges ? "Save" : "Saved"}
</Button>
```

### Step 10: Analytics (Hidden Route - WordPress Components + DataViews)

**File: `app/analytics/page.tsx`**
```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  __experimentalHeading as Heading,
  __experimentalText as Text,
  __experimentalVStack as VStack,
  __experimentalHStack as HStack,
} from '@wordpress/components';
import { DataViews } from '@wordpress/dataviews';

interface Stats {
  totalProjects: number;
  totalSaves: number;
  userStats: Array<{ email: string; projects: number; saves: number }>;
  recentSaves: Array<{ project: string; user: string; timestamp: number }>;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Text>Loading analytics...</Text>
      </div>
    );
  }

  // DataViews config for user stats
  const userFields = [
    { id: 'email', header: 'User', enableGlobalSearch: true },
    { id: 'projects', header: 'Projects', type: 'integer' },
    { id: 'saves', header: 'Total Saves', type: 'integer' },
  ];

  const userView = {
    type: 'table',
    layout: {},
  };

  // DataViews config for recent saves
  const recentFields = [
    { id: 'user', header: 'User', enableGlobalSearch: true },
    { id: 'project', header: 'Project' },
    {
      id: 'timestamp',
      header: 'When',
      render: ({ item }: any) => new Date(item.timestamp).toLocaleString(),
    },
  ];

  const recentView = {
    type: 'table',
    layout: {},
  };

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <VStack spacing={6} style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
        <Heading level={2}>Usage Analytics</Heading>

        {/* Summary Cards */}
        <HStack spacing={4} style={{ width: '100%' }}>
          <Card size="medium" style={{ flex: 1 }}>
            <CardBody>
              <VStack spacing={1}>
                <Heading level={1} style={{ margin: 0 }}>{stats.totalProjects}</Heading>
                <Text variant="muted">Total Projects</Text>
              </VStack>
            </CardBody>
          </Card>
          <Card size="medium" style={{ flex: 1 }}>
            <CardBody>
              <VStack spacing={1}>
                <Heading level={1} style={{ margin: 0 }}>{stats.totalSaves}</Heading>
                <Text variant="muted">Total Saves</Text>
              </VStack>
            </CardBody>
          </Card>
          <Card size="medium" style={{ flex: 1 }}>
            <CardBody>
              <VStack spacing={1}>
                <Heading level={1} style={{ margin: 0 }}>{stats.userStats.length}</Heading>
                <Text variant="muted">Active Users</Text>
              </VStack>
            </CardBody>
          </Card>
        </HStack>

        {/* Usage by User */}
        <Card size="medium" style={{ width: '100%' }}>
          <CardHeader>
            <Heading level={4}>Usage by User</Heading>
          </CardHeader>
          <CardBody>
            <DataViews
              data={stats.userStats}
              fields={userFields}
              view={userView}
              onChangeView={() => {}}
              getItemId={(item) => item.email}
            />
          </CardBody>
        </Card>

        {/* Recent Saves */}
        <Card size="medium" style={{ width: '100%' }}>
          <CardHeader>
            <Heading level={4}>Recent Saves</Heading>
          </CardHeader>
          <CardBody>
            <DataViews
              data={stats.recentSaves}
              fields={recentFields}
              view={recentView}
              onChangeView={() => {}}
              getItemId={(item, index) => `${item.user}-${item.timestamp}-${index}`}
            />
          </CardBody>
        </Card>
      </VStack>
    </div>
  );
}
```

**File: `app/api/analytics/route.ts`**
```typescript
import { NextResponse } from 'next/server';

const JSONBIN_API = 'https://api.jsonbin.io/v3';

export async function GET() {
  try {
    // Get all bins in collection
    const res = await fetch(
      `${JSONBIN_API}/c/${process.env.JSONBIN_COLLECTION_ID}/bins`,
      { headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY! } }
    );
    const bins = await res.json();

    // Aggregate
    const userMap: Record<string, { projects: number; saves: number }> = {};
    let totalSaves = 0;

    const recentSaves: Array<{ project: string; user: string; timestamp: number }> = [];

    for (const bin of bins) {
      const email = bin.record?.meta?.ownerEmail || 'unknown';
      const saves = bin.record?.meta?.saveCount || 1;
      const name = bin.record?.project?.name || 'Untitled';
      const lastSaved = bin.record?.meta?.lastSaved || 0;

      if (!userMap[email]) {
        userMap[email] = { projects: 0, saves: 0 };
      }
      userMap[email].projects++;
      userMap[email].saves += saves;
      totalSaves += saves;

      recentSaves.push({ project: name, user: email, timestamp: lastSaved });
    }

    const userStats = Object.entries(userMap)
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.saves - a.saves);

    recentSaves.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      totalProjects: bins.length,
      totalSaves,
      userStats,
      recentSaves: recentSaves.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
```

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `.env.local` | Modify | JSONBin + password |
| `middleware.ts` | Create | Auth all routes |
| `app/auth/page.tsx` | Create | Login (WordPress UI) |
| `app/api/auth/route.ts` | Create | Set cookie |
| `app/api/auth/me/route.ts` | Create | Get user |
| `app/api/projects/route.ts` | Create | List + create |
| `app/api/projects/[binId]/route.ts` | Create | Load + save + delete |
| `src/hooks/useAuth.ts` | Create | Auth hook |
| `src/hooks/useCloudProject.ts` | Create | Cloud ops |
| `src/components/ProjectsScreen.tsx` | Rewrite | My projects only |
| `src/components/TopBar.tsx` | Modify | Save button |
| `src/components/Editor.tsx` | Modify | Cloud + warning |
| `app/analytics/page.tsx` | Create | Hidden stats (Cards + DataViews) |
| `app/api/analytics/route.ts` | Create | Aggregate stats |

---

## What /analytics Shows

- **Summary Cards**: Total Projects, Total Saves, Active Users
- **DataViews Table**: Usage by user (email, projects, saves)
- **DataViews Table**: Recent saves (user, project, timestamp)

---

## Out of Scope (v2)

- Team project sharing
- Real auth (OAuth)
- Offline mode
- Real-time collab
- Project history/versions
