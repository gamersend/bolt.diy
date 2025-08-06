import { useState, useCallback, useEffect } from 'react';
import type { ProjectMetadata } from '~/lib/.server/projects/storage';

export interface ProjectFile {
  path: string;
  content: string;
  isBinary: boolean;
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all projects
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load projects');
      }

      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new project
  const createProject = useCallback(async (name: string, description?: string): Promise<ProjectMetadata | null> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('action', 'create');
      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Reload projects list
      await loadProjects();

      return data.project;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      console.error('Failed to create project:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  // Open a project
  const openProject = useCallback(async (projectId: string): Promise<{ project: ProjectMetadata; files: string[] } | null> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('action', 'open');
      formData.append('projectId', projectId);

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open project');
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open project');
      console.error('Failed to open project:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update project metadata
  const updateProject = useCallback(async (projectId: string, updates: Partial<ProjectMetadata>): Promise<ProjectMetadata | null> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('action', 'update');
      formData.append('projectId', projectId);
      formData.append('updates', JSON.stringify(updates));

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update project');
      }

      // Reload projects list
      await loadProjects();

      return data.project;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      console.error('Failed to update project:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  // Delete a project
  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('projectId', projectId);

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete project');
      }

      // Reload projects list
      await loadProjects();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      console.error('Failed to delete project:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  // Write file to project
  const writeFile = useCallback(async (projectId: string, path: string, content: string, isBinary = false): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('action', 'write');
      formData.append('projectId', projectId);
      formData.append('path', path);
      formData.append('content', content);
      formData.append('isBinary', isBinary.toString());

      const response = await fetch('/api/projects/files', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to write file');
      }

      return true;
    } catch (err) {
      console.error('Failed to write file:', err);
      return false;
    }
  }, []);

  // Read file from project
  const readFile = useCallback(async (projectId: string, path: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/projects/files?projectId=${projectId}&path=${encodeURIComponent(path)}`);

      if (!response.ok) {
        throw new Error('Failed to read file');
      }

      return await response.text();
    } catch (err) {
      console.error('Failed to read file:', err);
      return null;
    }
  }, []);

  // Delete file from project
  const deleteFile = useCallback(async (projectId: string, path: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('projectId', projectId);
      formData.append('path', path);

      const response = await fetch('/api/projects/files', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete file');
      }

      return true;
    } catch (err) {
      console.error('Failed to delete file:', err);
      return false;
    }
  }, []);

  // Batch write files
  const batchWriteFiles = useCallback(async (projectId: string, files: ProjectFile[]): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('action', 'batch-write');
      formData.append('projectId', projectId);
      formData.append('files', JSON.stringify(files));

      const response = await fetch('/api/projects/files', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to write files');
      }

      return true;
    } catch (err) {
      console.error('Failed to write files:', err);
      return false;
    }
  }, []);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    loading,
    error,
    loadProjects,
    createProject,
    openProject,
    updateProject,
    deleteProject,
    writeFile,
    readFile,
    deleteFile,
    batchWriteFiles,
  };
}