import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { SecretsDatabase } from '~/lib/.server/db/secrets';
import { initializeDatabase } from '~/lib/.server/db/index';
import { runMigrations } from '~/lib/.server/db/migrate';

// Initialize database on first request
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    await runMigrations();
    dbInitialized = true;
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    await ensureDbInitialized();
    
    const url = new URL(request.url);
    const secretId = url.searchParams.get('id');
    const search = url.searchParams.get('search');
    const service = url.searchParams.get('service');
    const expired = url.searchParams.get('expired') === 'true';
    
    const secretsDb = new SecretsDatabase();
    
    if (secretId) {
      const secret = await secretsDb.getSecret(secretId);
      if (!secret) {
        return json({ error: 'Secret not found' }, { status: 404 });
      }
      
      // Update last used timestamp
      await secretsDb.updateLastUsed(secretId);
      
      return json({ secret });
    }
    
    if (search) {
      const secrets = await secretsDb.searchSecrets(search);
      return json({ secrets });
    }
    
    if (service) {
      const secrets = await secretsDb.getSecretsByService(service);
      return json({ secrets });
    }
    
    if (expired) {
      const secrets = await secretsDb.getExpiredSecrets();
      return json({ secrets });
    }
    
    const secrets = await secretsDb.getAllSecrets();
    return json({ secrets });
  } catch (error) {
    console.error('Secrets API error:', error);
    
    if (error instanceof Error && error.message === 'Database not available') {
      return json({ 
        secrets: [],
        fallback: true,
        message: 'Using local storage. PostgreSQL not available.'
      });
    }
    
    return json({ error: 'Failed to fetch secrets' }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    await ensureDbInitialized();
    
    const formData = await request.formData();
    const action = formData.get('action') as string;
    const secretsDb = new SecretsDatabase();
    
    switch (action) {
      case 'create': {
        const secretData = {
          name: formData.get('name') as string,
          keyType: formData.get('keyType') as string || 'api_key',
          keyValue: formData.get('keyValue') as string,
          description: formData.get('description') as string || undefined,
          serviceName: formData.get('serviceName') as string || undefined,
          environment: formData.get('environment') as string || 'development',
          expiresAt: formData.get('expiresAt') as string || undefined,
          isActive: formData.get('isActive') !== 'false',
          metadata: formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {},
        };
        
        const secret = await secretsDb.createSecret(secretData);
        return json({ secret });
      }
      
      case 'update': {
        const id = formData.get('id') as string;
        const updates: any = {};
        
        if (formData.has('name')) updates.name = formData.get('name');
        if (formData.has('keyType')) updates.keyType = formData.get('keyType');
        if (formData.has('keyValue')) updates.keyValue = formData.get('keyValue');
        if (formData.has('description')) updates.description = formData.get('description');
        if (formData.has('serviceName')) updates.serviceName = formData.get('serviceName');
        if (formData.has('environment')) updates.environment = formData.get('environment');
        if (formData.has('expiresAt')) updates.expiresAt = formData.get('expiresAt');
        if (formData.has('isActive')) updates.isActive = formData.get('isActive') === 'true';
        if (formData.has('metadata')) updates.metadata = JSON.parse(formData.get('metadata') as string);
        
        const secret = await secretsDb.updateSecret(id, updates);
        return json({ secret });
      }
      
      case 'delete': {
        const id = formData.get('id') as string;
        await secretsDb.deleteSecret(id);
        return json({ success: true });
      }
      
      case 'updateLastUsed': {
        const id = formData.get('id') as string;
        await secretsDb.updateLastUsed(id);
        return json({ success: true });
      }
      
      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Secrets API action error:', error);
    
    if (error instanceof Error && error.message === 'Database not available') {
      return json({ 
        error: 'Database not available. Please use local storage.',
        fallback: true
      }, { status: 503 });
    }
    
    return json({ error: 'Failed to perform action' }, { status: 500 });
  }
}