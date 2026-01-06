import type { ProjectData, ProjectMeta } from './types';
import type { Project } from '@/types';

const LOCAL_STORAGE_KEY = 'wp-designer-projects-local';

interface StoredProjects {
  [projectId: string]: {
    data: ProjectData;
    name: string;
    ownerEmail: string;
    updatedAt: number;
  };
}

/**
 * Client-side storage service that abstracts the storage provider.
 *
 * - For 'local' provider: uses localStorage directly (no API)
 * - For 'jsonbin'/'supabase': routes through API endpoints
 */
class StorageService {
  private get provider(): string {
    return process.env.NEXT_PUBLIC_STORAGE_PROVIDER || 'jsonbin';
  }

  private get isLocal(): boolean {
    return this.provider === 'local';
  }

  // ============ localStorage helpers ============

  private getLocalStorage(): StoredProjects {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  private setLocalStorage(data: StoredProjects): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  }

  // ============ Public API ============

  async list(userId: string): Promise<any[]> {
    if (this.isLocal) {
      const storage = this.getLocalStorage();
      // Return in same format as API for consistency
      return Object.entries(storage)
        .filter(([_, item]) => item.ownerEmail === userId)
        .map(([id, item]) => ({
          metadata: { id },
          binId: id,
          record: {
            project: {
              id: item.data.project.id,
              name: item.name,
              pages: item.data.project.pages,
            },
            meta: { lastSaved: item.updatedAt }
          }
        }))
        .sort((a, b) => b.record.meta.lastSaved - a.record.meta.lastSaved);
    }

    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to list projects');
    return res.json();
  }

  async get(projectId: string): Promise<ProjectData & { binId: string }> {
    if (this.isLocal) {
      const storage = this.getLocalStorage();
      const item = storage[projectId];
      if (!item) throw new Error(`Project not found: ${projectId}`);
      return { binId: projectId, ...item.data };
    }

    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) throw new Error('Failed to load project');
    return res.json();
  }

  async create(userId: string, name: string): Promise<{ binId: string; project: Project; meta: ProjectMeta }> {
    if (this.isLocal) {
      const projectId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const rootGrid = {
        id: 'root-grid',
        type: 'Grid',
        props: {
          columns: 12,
          gap: 24,
          gridGuideColor: '#3858e9',
        },
        children: [],
        interactions: [],
      };

      const project: Project = {
        id: `project-${Date.now()}`,
        name,
        version: 3,
        pages: [{
          id: 'page-1',
          name: 'Home',
          tree: [rootGrid],
          theme: { primaryColor: '#3858e9', backgroundColor: '#ffffff' },
        }],
        currentPageId: 'page-1',
        createdAt: Date.now(),
        lastModified: Date.now(),
      };

      const meta: ProjectMeta = {
        ownerEmail: userId,
        createdAt: Date.now(),
        lastSaved: Date.now(),
        saveCount: 1,
      };

      const storage = this.getLocalStorage();
      storage[projectId] = {
        data: { project, meta },
        name,
        ownerEmail: userId,
        updatedAt: Date.now(),
      };
      this.setLocalStorage(storage);

      return { binId: projectId, project, meta };
    }

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  }

  async update(projectId: string, project: Project, meta: ProjectMeta): Promise<ProjectMeta> {
    if (this.isLocal) {
      const storage = this.getLocalStorage();
      const item = storage[projectId];
      if (!item) throw new Error(`Project not found: ${projectId}`);

      const updatedMeta: ProjectMeta = {
        ...meta,
        lastSaved: Date.now(),
        saveCount: (meta?.saveCount || 0) + 1,
      };

      storage[projectId] = {
        data: { project, meta: updatedMeta },
        name: project.name,
        ownerEmail: item.ownerEmail,
        updatedAt: Date.now(),
      };
      this.setLocalStorage(storage);

      return updatedMeta;
    }

    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, meta }),
    });
    if (!res.ok) throw new Error('Failed to save project');
    return res.json();
  }

  async delete(projectId: string): Promise<void> {
    if (this.isLocal) {
      const storage = this.getLocalStorage();
      if (!storage[projectId]) throw new Error(`Project not found: ${projectId}`);
      delete storage[projectId];
      this.setLocalStorage(storage);
      return;
    }

    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete project');
  }
}

// Export singleton instance
export const storageService = new StorageService();
