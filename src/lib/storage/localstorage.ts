import type { StorageProvider, ProjectSummary, ProjectData, CreateProjectResult, ProjectMeta } from './types';
import type { Project } from '@/types';

const STORAGE_KEY = 'wp-designer-projects-local';

interface StoredProjects {
  [projectId: string]: {
    data: ProjectData;
    name: string;
    ownerEmail: string;
    updatedAt: number;
  };
}

/**
 * localStorage storage provider for local development/testing.
 * No external services required.
 */
export class LocalStorageProvider implements StorageProvider {
  private getStorage(): StoredProjects {
    if (typeof window === 'undefined') {
      return {};
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  private setStorage(data: StoredProjects): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async list(userId: string): Promise<ProjectSummary[]> {
    const storage = this.getStorage();

    return Object.entries(storage)
      .filter(([_, item]) => item.ownerEmail === userId)
      .map(([id, item]) => ({
        id,
        name: item.name,
        lastSaved: item.updatedAt,
      }))
      .sort((a, b) => b.lastSaved - a.lastSaved);
  }

  async get(projectId: string): Promise<ProjectData> {
    const storage = this.getStorage();
    const item = storage[projectId];

    if (!item) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return item.data;
  }

  async create(userId: string, name: string, description?: string): Promise<CreateProjectResult> {
    const projectId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Create root Grid for the page (required for canvas to work)
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
      description,
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

    const projectData: ProjectData = { project, meta };

    const storage = this.getStorage();
    storage[projectId] = {
      data: projectData,
      name,
      ownerEmail: userId,
      updatedAt: Date.now(),
    };
    this.setStorage(storage);

    return {
      projectId,
      project,
      meta,
    };
  }

  async update(projectId: string, data: ProjectData, userId?: string): Promise<ProjectMeta> {
    const storage = this.getStorage();
    const item = storage[projectId];

    if (!item) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const updatedMeta: ProjectMeta = {
      ...data.meta,
      lastSaved: Date.now(),
      lastSavedBy: userId,
      saveCount: (data.meta?.saveCount || 0) + 1,
    };

    storage[projectId] = {
      data: { project: data.project, meta: updatedMeta },
      name: data.project.name,
      ownerEmail: item.ownerEmail,
      updatedAt: Date.now(),
    };
    this.setStorage(storage);

    return updatedMeta;
  }

  async delete(projectId: string): Promise<void> {
    const storage = this.getStorage();

    if (!storage[projectId]) {
      throw new Error(`Project not found: ${projectId}`);
    }

    delete storage[projectId];
    this.setStorage(storage);
  }
}
