import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getProjectStorage } from '~/lib/.server/projects/storage';

// Check if we're in a Node.js environment
const isNodeEnvironment = typeof process !== 'undefined' && process.versions && process.versions.node;

export async function loader({ request }: LoaderFunctionArgs) {
  if (!isNodeEnvironment) {
    return json({ error: 'Project storage is only available in Node.js environment' }, { status: 503 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('id');

  try {
    const storage = getProjectStorage();

    if (projectId) {
      // Get specific project
      const metadata = await storage.getProjectMetadata(projectId);
      if (!metadata) {
        return json({ error: 'Project not found' }, { status: 404 });
      }

      // Get file tree if requested
      if (url.searchParams.get('includeFiles') === 'true') {
        const files = await storage.getFileTree(projectId);
        return json({ metadata, files });
      }

      return json({ metadata });
    } else {
      // List all projects
      const projects = await storage.listProjects();
      return json({ projects });
    }
  } catch (error) {
    console.error('Failed to load projects:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to load projects' },
      { status: 500 }
    );
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (!isNodeEnvironment) {
    return json({ error: 'Project storage is only available in Node.js environment' }, { status: 503 });
  }

  const storage = getProjectStorage();
  const formData = await request.formData();
  const action = formData.get('action') as string;

  try {
    switch (action) {
      case 'create': {
        const name = formData.get('name') as string;
        const description = formData.get('description') as string | undefined;

        if (!name) {
          return json({ error: 'Project name is required' }, { status: 400 });
        }

        const project = await storage.createProject(name, description);
        return json({ project });
      }

      case 'update': {
        const projectId = formData.get('projectId') as string;
        const updates = JSON.parse(formData.get('updates') as string);

        if (!projectId) {
          return json({ error: 'Project ID is required' }, { status: 400 });
        }

        const updated = await storage.updateProjectMetadata(projectId, updates);
        return json({ project: updated });
      }

      case 'delete': {
        const projectId = formData.get('projectId') as string;

        if (!projectId) {
          return json({ error: 'Project ID is required' }, { status: 400 });
        }

        await storage.deleteProject(projectId);
        return json({ success: true });
      }

      case 'open': {
        const projectId = formData.get('projectId') as string;

        if (!projectId) {
          return json({ error: 'Project ID is required' }, { status: 400 });
        }

        // Update last opened timestamp
        const updated = await storage.updateProjectMetadata(projectId, {
          lastOpenedAt: new Date().toISOString(),
        });

        // Get file list
        const files = await storage.listFiles(projectId);
        
        return json({ project: updated, files });
      }

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Project action failed:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}