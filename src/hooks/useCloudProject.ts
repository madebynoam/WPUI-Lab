import { useState, useCallback } from 'react';
import { storageService } from '@/lib/storage/client';

export function useCloudProject() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listProjects = useCallback(async (userId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      return await storageService.list(userId || '');
    } catch {
      setError('Failed to list projects');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string, userId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      return await storageService.create(userId || '', name);
    } catch {
      setError('Failed to create project');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProject = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      return await storageService.get(projectId);
    } catch {
      setError('Failed to load project');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProject = useCallback(async (projectId: string, project: any, meta: any) => {
    setIsSaving(true);
    setError(null);
    try {
      return await storageService.update(projectId, project, meta);
    } catch {
      setError('Failed to save');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    setError(null);
    try {
      await storageService.delete(projectId);
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
