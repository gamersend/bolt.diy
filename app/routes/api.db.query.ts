import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getDb } from '~/lib/.server/db';
import { z } from 'zod';

const querySchema = z.object({
  sql: z.string().min(1),
});

// POST /api/db/query - Execute arbitrary SQL
export async function action({ request }: ActionFunctionArgs) {
  try {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const body = await request.json();
    const validation = querySchema.safeParse(body);
    
    if (!validation.success) {
      return json({ 
        error: 'Invalid request body', 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { sql } = validation.data;
    
    const db = await getDb();
    if (!db) {
      return json({ error: 'Database connection not available' }, { status: 503 });
    }

    try {
      const result = await db.query(sql);
      
      // Determine if this was a SELECT query or a mutation
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      
      return json({
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(field => ({
          name: field.name,
          dataTypeID: field.dataTypeID,
        })),
        command: result.command,
        isSelect,
      });
    } catch (queryError) {
      // Database query error (e.g., syntax error, permission denied)
      return json({ 
        error: 'Query execution failed', 
        details: queryError instanceof Error ? queryError.message : 'Unknown error',
        sql,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    return json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ error: 'Method not allowed. Use POST to execute queries.' }, { status: 405 });
}