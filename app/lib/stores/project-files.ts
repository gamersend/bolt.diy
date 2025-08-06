import { FilesStore, type FileMap, type File, type Folder } from './files';
import type { WebContainer } from '@webcontainer/api';
import type { ProjectMetadata } from '~/lib/.server/projects/storage';
import { map } from 'nanostores';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ProjectFilesStore');

export interface ProjectState {
  project: ProjectMetadata | null;
  syncing: boolean;
  lastSyncedAt: string | null;
}

export class ProjectFilesStore extends FilesStore {
  #projectId: string | null = null;
  #syncInterval: NodeJS.Timeout | null = null;
  #syncQueue: Map<string, { content: string; isBinary: boolean }> = new Map();
  #isSyncing = false;

  projectState = map<ProjectState>({
    project: null,
    syncing: false,
    lastSyncedAt: null,
  });

  constructor(webcontainerPromise: Promise<WebContainer>) {
    super(webcontainerPromise);
  }

  /**
   * Set the current project for syncing
   */
  async setProject(project: ProjectMetadata | null) {
    this.#projectId = project?.id || null;
    
    this.projectState.set({
      project,
      syncing: false,
      lastSyncedAt: null,
    });

    // Clear sync interval when changing projects
    if (this.#syncInterval) {
      clearInterval(this.#syncInterval);
      this.#syncInterval = null;
    }

    // Start auto-sync if project is set
    if (project) {
      this.#startAutoSync();
    }
  }

  /**
   * Load files from a project into WebContainer
   */
  async loadProjectFiles(projectId: string): Promise<void> {
    try {
      const response = await fetch(`/api/projects/files?projectId=${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load project files');
      }

      const { files } = data;

      // Load each file into WebContainer
      for (const filePath of files) {
        try {
          const fileResponse = await fetch(
            `/api/projects/files?projectId=${projectId}&path=${encodeURIComponent(filePath)}`
          );

          if (fileResponse.ok) {
            const content = await fileResponse.text();
            
            // Write to WebContainer through parent FilesStore
            await this.writeFile(filePath, content);
          }
        } catch (error) {
          logger.error(`Failed to load file ${filePath}:`, error);
        }
      }

      logger.info(`Loaded ${files.length} files from project ${projectId}`);
    } catch (error) {
      logger.error('Failed to load project files:', error);
      throw error;
    }
  }

  /**
   * Override writeFile to queue sync operations
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    // Call parent implementation
    await super.writeFile(filePath, content);

    // Queue for sync if we have a project
    if (this.#projectId) {
      const isBinary = await this.isFileBinary(filePath, content);
      this.#syncQueue.set(filePath, { content, isBinary });
      this.#processSyncQueue();
    }
  }

  /**
   * Override removeFile to sync deletions
   */
  async removeFile(filePath: string): Promise<void> {
    // Call parent implementation
    await super.removeFile(filePath);

    // Sync deletion if we have a project
    if (this.#projectId) {
      try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('projectId', this.#projectId);
        formData.append('path', filePath);

        await fetch('/api/projects/files', {
          method: 'POST',
          body: formData,
        });
      } catch (error) {
        logger.error(`Failed to sync file deletion ${filePath}:`, error);
      }
    }
  }

  /**
   * Sync all current files to project storage
   */
  async syncToProject(): Promise<void> {
    if (!this.#projectId) {
      throw new Error('No project set for syncing');
    }

    const currentState = this.projectState.get();
    this.projectState.set({ ...currentState, syncing: true });

    try {
      const files = this.files.get();
      const filesToSync: Array<{ path: string; content: string; isBinary: boolean }> = [];

      // Collect all files to sync
      for (const [filePath, dirent] of Object.entries(files)) {
        if (dirent?.type === 'file') {
          filesToSync.push({
            path: filePath,
            content: dirent.content,
            isBinary: dirent.isBinary,
          });
        }
      }

      // Batch sync files
      if (filesToSync.length > 0) {
        const formData = new FormData();
        formData.append('action', 'batch-write');
        formData.append('projectId', this.#projectId);
        formData.append('files', JSON.stringify(filesToSync));

        const response = await fetch('/api/projects/files', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to sync files');
        }

        logger.info(`Synced ${filesToSync.length} files to project ${this.#projectId}`);
      }

      this.projectState.set({
        ...this.projectState.get(),
        syncing: false,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to sync to project:', error);
      this.projectState.set({ ...this.projectState.get(), syncing: false });
      throw error;
    }
  }

  /**
   * Private helper to check if content is binary
   */
  private async isFileBinary(filePath: string, content: string): Promise<boolean> {
    // Simple heuristic - check for common binary file extensions
    const binaryExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.exe', '.dll'];
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    
    if (binaryExtensions.includes(ext)) {
      return true;
    }

    // Check for null bytes in content
    return content.includes('\0');
  }

  /**
   * Process the sync queue
   */
  private async #processSyncQueue(): Promise<void> {
    if (this.#isSyncing || this.#syncQueue.size === 0 || !this.#projectId) {
      return;
    }

    this.#isSyncing = true;
    const currentState = this.projectState.get();
    this.projectState.set({ ...currentState, syncing: true });

    try {
      // Get all queued files
      const files = Array.from(this.#syncQueue.entries()).map(([path, data]) => ({
        path,
        content: data.content,
        isBinary: data.isBinary,
      }));

      // Clear the queue
      this.#syncQueue.clear();

      // Batch sync
      const formData = new FormData();
      formData.append('action', 'batch-write');
      formData.append('projectId', this.#projectId);
      formData.append('files', JSON.stringify(files));

      const response = await fetch('/api/projects/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Re-queue files on failure
        files.forEach(file => {
          this.#syncQueue.set(file.path, { content: file.content, isBinary: file.isBinary });
        });
        throw new Error('Failed to sync files');
      }

      this.projectState.set({
        ...this.projectState.get(),
        syncing: false,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to process sync queue:', error);
      this.projectState.set({ ...this.projectState.get(), syncing: false });
    } finally {
      this.#isSyncing = false;

      // Process any new items that were added while syncing
      if (this.#syncQueue.size > 0) {
        setTimeout(() => this.#processSyncQueue(), 100);
      }
    }
  }

  /**
   * Start auto-sync interval
   */
  private #startAutoSync(): void {
    // Sync every 5 seconds if there are changes
    this.#syncInterval = setInterval(() => {
      if (this.#syncQueue.size > 0) {
        this.#processSyncQueue();
      }
    }, 5000);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.#syncInterval) {
      clearInterval(this.#syncInterval);
      this.#syncInterval = null;
    }
  }
}

// Factory function to create ProjectFilesStore
export function createProjectFilesStore(webcontainerPromise: Promise<WebContainer>): ProjectFilesStore {
  return new ProjectFilesStore(webcontainerPromise);
}