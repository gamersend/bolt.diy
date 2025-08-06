import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

// Project metadata interface
export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  gitUrl?: string;
  gitBranch?: string;
  tags?: string[];
  chatIds?: string[]; // Associated chat sessions
}

// Project storage configuration
export interface ProjectStorageConfig {
  baseDir: string;
  maxProjects?: number;
  maxProjectSize?: number; // in bytes
}

// Default configuration
const DEFAULT_CONFIG: ProjectStorageConfig = {
  baseDir: process.env.BOLT_PROJECTS_DIR || path.join(process.cwd(), 'bolt-projects'),
  maxProjects: 1000,
  maxProjectSize: 100 * 1024 * 1024, // 100MB per project
};

export class ProjectStorage {
  private config: ProjectStorageConfig;

  constructor(config?: Partial<ProjectStorageConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the storage directory
   */
  async initialize(): Promise<void> {
    if (!existsSync(this.config.baseDir)) {
      await fs.mkdir(this.config.baseDir, { recursive: true });
    }
  }

  /**
   * Create a new project
   */
  async createProject(name: string, description?: string): Promise<ProjectMetadata> {
    await this.initialize();

    const projectId = this.generateProjectId();
    const projectPath = this.getProjectPath(projectId);

    // Create project directory
    await fs.mkdir(projectPath, { recursive: true });

    // Create metadata
    const metadata: ProjectMetadata = {
      id: projectId,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save metadata
    await this.saveMetadata(projectId, metadata);

    // Create default directory structure
    await this.createDefaultStructure(projectPath);

    return metadata;
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<ProjectMetadata[]> {
    await this.initialize();

    const entries = await fs.readdir(this.config.baseDir, { withFileTypes: true });
    const projects: ProjectMetadata[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const metadata = await this.getProjectMetadata(entry.name);
          if (metadata) {
            projects.push(metadata);
          }
        } catch (error) {
          console.error(`Failed to read project metadata for ${entry.name}:`, error);
        }
      }
    }

    // Sort by last opened date, then updated date
    projects.sort((a, b) => {
      const aDate = a.lastOpenedAt || a.updatedAt;
      const bDate = b.lastOpenedAt || b.updatedAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    return projects;
  }

  /**
   * Get project metadata
   */
  async getProjectMetadata(projectId: string): Promise<ProjectMetadata | null> {
    const metadataPath = path.join(this.getProjectPath(projectId), '.bolt', 'metadata.json');
    
    try {
      const data = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(data) as ProjectMetadata;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update project metadata
   */
  async updateProjectMetadata(projectId: string, updates: Partial<ProjectMetadata>): Promise<ProjectMetadata> {
    const current = await this.getProjectMetadata(projectId);
    if (!current) {
      throw new Error(`Project ${projectId} not found`);
    }

    const updated: ProjectMetadata = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.saveMetadata(projectId, updated);
    return updated;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    await fs.rm(projectPath, { recursive: true, force: true });
  }

  /**
   * Get project file system path
   */
  getProjectPath(projectId: string): string {
    return path.join(this.config.baseDir, projectId);
  }

  /**
   * Write file to project
   */
  async writeFile(projectId: string, filePath: string, content: string | Buffer): Promise<void> {
    const fullPath = path.join(this.getProjectPath(projectId), filePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content);

    // Update project metadata
    await this.updateProjectMetadata(projectId, {
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Read file from project
   */
  async readFile(projectId: string, filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.getProjectPath(projectId), filePath);
    return await fs.readFile(fullPath);
  }

  /**
   * Delete file from project
   */
  async deleteFile(projectId: string, filePath: string): Promise<void> {
    const fullPath = path.join(this.getProjectPath(projectId), filePath);
    await fs.unlink(fullPath);

    // Update project metadata
    await this.updateProjectMetadata(projectId, {
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * List files in project
   */
  async listFiles(projectId: string, dirPath: string = '/'): Promise<string[]> {
    const fullPath = path.join(this.getProjectPath(projectId), dirPath);
    const files: string[] = [];

    async function walkDir(currentPath: string, basePath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, entryPath);

        if (entry.isDirectory()) {
          // Skip .bolt directory
          if (entry.name !== '.bolt') {
            await walkDir(entryPath, basePath);
          }
        } else {
          files.push('/' + relativePath.replace(/\\/g, '/'));
        }
      }
    }

    try {
      await walkDir(fullPath, this.getProjectPath(projectId));
    } catch (error) {
      // Directory might not exist yet
      console.error('Error listing files:', error);
    }

    return files;
  }

  /**
   * Get project file tree
   */
  async getFileTree(projectId: string): Promise<any> {
    const projectPath = this.getProjectPath(projectId);
    
    async function buildTree(dirPath: string, name: string): Promise<any> {
      const fullPath = path.join(dirPath, name);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        const children = await fs.readdir(fullPath);
        const childNodes = await Promise.all(
          children
            .filter(child => child !== '.bolt') // Skip .bolt directory
            .map(child => buildTree(fullPath, child))
        );

        return {
          name,
          type: 'directory',
          children: childNodes,
        };
      } else {
        return {
          name,
          type: 'file',
          size: stats.size,
        };
      }
    }

    try {
      const entries = await fs.readdir(projectPath);
      const tree = await Promise.all(
        entries
          .filter(entry => entry !== '.bolt')
          .map(entry => buildTree(projectPath, entry))
      );

      return tree;
    } catch (error) {
      return [];
    }
  }

  /**
   * Export project as zip
   */
  async exportProject(projectId: string): Promise<Buffer> {
    // This would require a zip library like archiver
    // For now, returning a placeholder
    throw new Error('Export functionality not yet implemented');
  }

  /**
   * Import project from zip
   */
  async importProject(zipBuffer: Buffer, name: string): Promise<ProjectMetadata> {
    // This would require a zip library like node-stream-zip
    // For now, returning a placeholder
    throw new Error('Import functionality not yet implemented');
  }

  /**
   * Private helper methods
   */
  private generateProjectId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private async saveMetadata(projectId: string, metadata: ProjectMetadata): Promise<void> {
    const metadataDir = path.join(this.getProjectPath(projectId), '.bolt');
    const metadataPath = path.join(metadataDir, 'metadata.json');

    await fs.mkdir(metadataDir, { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async createDefaultStructure(projectPath: string): Promise<void> {
    // Create default directories
    const defaultDirs = ['src', 'public', '.bolt'];
    
    for (const dir of defaultDirs) {
      await fs.mkdir(path.join(projectPath, dir), { recursive: true });
    }

    // Create a default README
    const readmePath = path.join(projectPath, 'README.md');
    await fs.writeFile(readmePath, '# New Bolt Project\n\nWelcome to your new Bolt project!\n');
  }
}

// Singleton instance
let projectStorage: ProjectStorage | null = null;

export function getProjectStorage(): ProjectStorage {
  if (!projectStorage) {
    projectStorage = new ProjectStorage();
  }
  return projectStorage;
}