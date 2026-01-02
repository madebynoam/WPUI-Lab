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
