import React, { useState, useEffect } from 'react';
import { ProjectManager } from './ProjectManager';
import type { ProjectMetadata } from '~/lib/.server/projects/storage';
import { toast } from 'react-toastify';

interface ProjectIntegrationProps {
  onProjectSelect?: (project: ProjectMetadata) => void;
  currentProject?: ProjectMetadata | null;
}

export function ProjectIntegration({ onProjectSelect, currentProject }: ProjectIntegrationProps) {
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [isLocalStorageMode, setIsLocalStorageMode] = useState(true);

  useEffect(() => {
    // Check if we're in a Node.js environment by testing the API
    fetch('/api/projects')
      .then(response => {
        if (response.ok) {
          setIsLocalStorageMode(false);
        }
      })
      .catch(() => {
        // API not available, stay in localStorage mode
      });
  }, []);

  const handleProjectOpen = (project: ProjectMetadata) => {
    setShowProjectManager(false);
    if (onProjectSelect) {
      onProjectSelect(project);
    }
    toast.success(`Opened project: ${project.name}`);
  };

  return (
    <>
      {/* Project Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isLocalStorageMode ? 'Storage Mode: Browser' : 'Storage Mode: Local Files'}
          </span>
          {currentProject && (
            <span className="text-sm font-medium">
              Project: {currentProject.name}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isLocalStorageMode && (
            <button
              onClick={() => setShowProjectManager(!showProjectManager)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {showProjectManager ? 'Hide Projects' : 'Manage Projects'}
            </button>
          )}
          
          {isLocalStorageMode && (
            <div className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ File system storage not available
            </div>
          )}
        </div>
      </div>

      {/* Project Manager Panel */}
      {showProjectManager && !isLocalStorageMode && (
        <div className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg z-40">
          <ProjectManager
            onProjectOpen={handleProjectOpen}
            className="h-full"
          />
        </div>
      )}

      {/* Overlay to close project manager */}
      {showProjectManager && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setShowProjectManager(false)}
        />
      )}
    </>
  );
}