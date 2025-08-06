import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getProjectStorage } from '~/lib/.server/projects/storage';

// Check if we're in a Node.js environment
const isNodeEnvironment = typeof process !== 'undefined' && process.versions && process.versions.node;

export async function loader({ request }: LoaderFunctionArgs) {
  if (!isNodeEnvironment) {
    return json({ error: 'Project storage is only available in Node.js environment' }, { status: 503 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const filePath = url.searchParams.get('path');

  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const storage = getProjectStorage();

    if (filePath) {
      // Read specific file
      const content = await storage.readFile(projectId, filePath);
      
      // Determine if it's a text file based on extension
      const isTextFile = /\.(txt|md|js|jsx|ts|tsx|css|html|json|xml|yaml|yml|env|gitignore|vue|svelte)$/i.test(filePath);
      
      if (isTextFile) {
        return new Response(content, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      } else {
        return new Response(content, {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        });
      }
    } else {
      // List all files
      const files = await storage.listFiles(projectId);
      return json({ files });
    }
  } catch (error) {
    console.error('Failed to read file:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to read file' },
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
  const projectId = formData.get('projectId') as string;

  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'write': {
        const filePath = formData.get('path') as string;
        const content = formData.get('content') as string;
        const isBinary = formData.get('isBinary') === 'true';

        if (!filePath) {
          return json({ error: 'File path is required' }, { status: 400 });
        }

        const buffer = isBinary 
          ? Buffer.from(content, 'base64')
          : Buffer.from(content, 'utf-8');

        await storage.writeFile(projectId, filePath, buffer);
        return json({ success: true });
      }

      case 'delete': {
        const filePath = formData.get('path') as string;

        if (!filePath) {
          return json({ error: 'File path is required' }, { status: 400 });
        }

        await storage.deleteFile(projectId, filePath);
        return json({ success: true });
      }

      case 'batch-write': {
        const files = JSON.parse(formData.get('files') as string);

        for (const file of files) {
          const buffer = file.isBinary
            ? Buffer.from(file.content, 'base64')
            : Buffer.from(file.content, 'utf-8');

          await storage.writeFile(projectId, file.path, buffer);
        }

        return json({ success: true, count: files.length });
      }

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('File action failed:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}