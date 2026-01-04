import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { StorageProvider, ProjectSummary, ProjectData, CreateProjectResult, ProjectMeta } from './types';
import type { Project } from '@/types';

interface ProjectRow {
  id: string;
  owner_email: string;
  name: string;
  data: ProjectData;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase storage provider implementation.
 */
export class SupabaseProvider implements StorageProvider {
  private supabase: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
    if (!key) {
      throw new Error('SUPABASE_SERVICE_KEY environment variable is required');
    }

    this.supabase = createClient(url, key);
  }

  async list(userId: string): Promise<ProjectSummary[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('id, name, updated_at')
      .eq('owner_email', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list projects: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      lastSaved: new Date(row.updated_at).getTime(),
    }));
  }

  async get(projectId: string): Promise<ProjectData> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('data')
      .eq('id', projectId)
      .single();

    if (error) {
      throw new Error(`Failed to load project: ${error.message}`);
    }

    return data.data as ProjectData;
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

    const projectData: ProjectData = { project, meta };

    const { data, error } = await this.supabase
      .from('projects')
      .insert({
        owner_email: userId,
        name,
        data: projectData,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    return {
      projectId: data.id,
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

    const projectData: ProjectData = {
      project: data.project,
      meta: updatedMeta,
    };

    const { error } = await this.supabase
      .from('projects')
      .update({ data: projectData })
      .eq('id', projectId);

    if (error) {
      throw new Error(`Failed to save project: ${error.message}`);
    }

    return updatedMeta;
  }

  async delete(projectId: string): Promise<void> {
    const { error } = await this.supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }
}
