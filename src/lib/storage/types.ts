import type { Project } from '@/types';

/**
 * Summary of a project for listing views.
 */
export interface ProjectSummary {
  id: string;
  name: string;
  lastSaved: number;
}

/**
 * Metadata about a stored project.
 */
export interface ProjectMeta {
  ownerEmail: string;
  createdAt: number;
  lastSaved: number;
  lastSavedBy?: string;
  saveCount: number;
}

/**
 * Full project data as stored.
 */
export interface ProjectData {
  project: Project;
  meta: ProjectMeta;
}

/**
 * Result of creating a new project.
 */
export interface CreateProjectResult {
  projectId: string;
  project: Project;
  meta: ProjectMeta;
}

/**
 * Abstract storage provider interface.
 * Implementations can use JSONBin, Supabase, Firebase, etc.
 */
export interface StorageProvider {
  /**
   * List all projects for a user.
   */
  list(userId: string): Promise<ProjectSummary[]>;

  /**
   * Get a single project by ID.
   */
  get(projectId: string): Promise<ProjectData>;

  /**
   * Create a new project.
   */
  create(userId: string, name: string): Promise<CreateProjectResult>;

  /**
   * Update an existing project.
   */
  update(projectId: string, data: ProjectData, userId?: string): Promise<ProjectMeta>;

  /**
   * Delete a project.
   */
  delete(projectId: string): Promise<void>;
}
