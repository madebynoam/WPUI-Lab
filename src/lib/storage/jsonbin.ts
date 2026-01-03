import type { StorageProvider, ProjectSummary, ProjectData, CreateProjectResult, ProjectMeta } from './types';
import type { Project } from '@/types';

const JSONBIN_API = 'https://api.jsonbin.io/v3';

/**
 * JSONBin.io storage provider implementation.
 */
export class JSONBinProvider implements StorageProvider {
  private apiKey: string;
  private collectionId: string;

  constructor() {
    const apiKey = process.env.JSONBIN_API_KEY;
    const collectionId = process.env.JSONBIN_COLLECTION_ID;

    if (!apiKey) {
      throw new Error('JSONBIN_API_KEY environment variable is required');
    }
    if (!collectionId) {
      throw new Error('JSONBIN_COLLECTION_ID environment variable is required');
    }

    this.apiKey = apiKey;
    this.collectionId = collectionId;
  }

  async list(userId: string): Promise<ProjectSummary[]> {
    const res = await fetch(
      `${JSONBIN_API}/c/${this.collectionId}/bins`,
      { headers: { 'X-Master-Key': this.apiKey } }
    );

    if (!res.ok) {
      throw new Error(`Failed to list projects: ${res.statusText}`);
    }

    const bins = await res.json();

    // Collection listing returns: { record: "binId", snippetMeta: { name: "email-projectName" }, ... }
    // Filter by bin name prefix (email-) since record is just the ID, not the content
    const myProjects = (Array.isArray(bins) ? bins : [])
      .filter((b: any) => b.snippetMeta?.name?.startsWith(`${userId}-`))
      .map((b: any) => ({
        id: b.record,
        name: b.snippetMeta?.name?.replace(`${userId}-`, '') || 'Untitled',
        lastSaved: new Date(b.createdAt).getTime(),
      }));

    return myProjects;
  }

  async get(projectId: string): Promise<ProjectData> {
    const res = await fetch(`${JSONBIN_API}/b/${projectId}/latest`, {
      headers: { 'X-Master-Key': this.apiKey },
    });

    if (!res.ok) {
      throw new Error(`Failed to load project: ${res.statusText}`);
    }

    const data = await res.json();
    return data.record as ProjectData;
  }

  async create(userId: string, name: string): Promise<CreateProjectResult> {
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

    const payload: ProjectData = { project, meta };

    const res = await fetch(`${JSONBIN_API}/b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': this.apiKey,
        'X-Collection-Id': this.collectionId,
        'X-Bin-Name': `${userId}-${name}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to create project');
    }

    const binId = data.metadata?.id;
    if (!binId) {
      throw new Error('Invalid response from storage: missing bin ID');
    }

    return {
      projectId: binId,
      project,
      meta,
    };
  }

  async update(projectId: string, data: ProjectData, userId?: string): Promise<ProjectMeta> {
    const updatedMeta: ProjectMeta = {
      ...data.meta,
      lastSaved: Date.now(),
      lastSavedBy: userId,
      saveCount: (data.meta?.saveCount || 0) + 1,
    };

    const payload: ProjectData = {
      project: data.project,
      meta: updatedMeta,
    };

    const res = await fetch(`${JSONBIN_API}/b/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to save project: ${res.statusText}`);
    }

    return updatedMeta;
  }

  async delete(projectId: string): Promise<void> {
    const res = await fetch(`${JSONBIN_API}/b/${projectId}`, {
      method: 'DELETE',
      headers: { 'X-Master-Key': this.apiKey },
    });

    if (!res.ok) {
      throw new Error(`Failed to delete project: ${res.statusText}`);
    }
  }
}
