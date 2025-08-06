import React, { useState, useCallback } from 'react';
import type { ProjectMetadata } from '~/lib/.server/projects/storage';
import { ProjectIntegration } from '~/components/projects/ProjectIntegration';
import { useProjects } from '~/lib/hooks/useProjects';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { createProjectFilesStore } from '~/lib/stores/project-files';
import { webcontainer } from '~/lib/webcontainer';

/**
 * Example integration of project storage with the chat interface
 * This component shows how to:
 * 1. Display project manager UI
 * 2. Load project files into WebContainer
 * 3. Sync WebContainer changes back to project storage
 */
export function ChatWithProjects({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProject] = useState<ProjectMetadata | null>(null);
  const { openProject, batchWriteFiles } = useProjects();
  const workbench = useStore(workbenchStore);
  
  // Create project files store instance
  const [projectFilesStore] = useState(() => createProjectFilesStore(webcontainer));

  const handleProjectSelect = useCallback(async (project: ProjectMetadata) => {
    try {
      // Open the project
      const result = await openProject(project.id);
      if (!result) {
        throw new Error('Failed to open project');
      }

      setCurrentProject(result.project);
      
      // Set project in the files store for auto-sync
      await projectFilesStore.setProject(result.project);
      
      // Load project files into WebContainer
      await projectFilesStore.loadProjectFiles(project.id);
      
      toast.success(`Loaded project: ${project.name}`);
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project files');
    }
  }, [openProject, projectFilesStore]);

  const handleSaveToProject = useCallback(async () => {
    if (!currentProject) {
      toast.error('No project selected');
      return;
    }

    try {
      // Sync all current files to project storage
      await projectFilesStore.syncToProject();
      toast.success('Project saved successfully');
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project');
    }
  }, [currentProject, projectFilesStore]);

  return (
    <div className="flex flex-col h-full">
      {/* Project Integration Header */}
      <ProjectIntegration
        onProjectSelect={handleProjectSelect}
        currentProject={currentProject}
      />
      
      {/* Original Chat Content */}
      <div className="flex-1 relative">
        {children}
        
        {/* Floating Save Button (only when project is loaded) */}
        {currentProject && (
          <button
            onClick={handleSaveToProject}
            className="absolute bottom-4 right-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            title="Save all changes to project"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save to Project
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Usage Example:
 * 
 * In your main Chat component, wrap it with ChatWithProjects:
 * 
 * export function Chat() {
 *   return (
 *     <ChatWithProjects>
 *       <BaseChat />
 *     </ChatWithProjects>
 *   );
 * }
 */