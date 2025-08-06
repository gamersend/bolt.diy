import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getDb } from '~/lib/.server/db';
import { z } from 'zod';

const querySchema = z.object({
  table: z.string(),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 200),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
});

// GET /api/db/rows?table=<name>&limit=200&offset=0
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    
    const validation = querySchema.safeParse(params);
    if (!validation.success) {
      return json({ 
        error: 'Invalid parameters', 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { table, limit, offset } = validation.data;
    
    const db = await getDb();
    if (!db) {
      return json({ error: 'Database connection not available' }, { status: 503 });
    }

    // Validate table name to prevent SQL injection
    const tableCheckResult = await db.query(
      'SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = $1 AND tablename = $2)',
      ['public', table]
    );

    if (!tableCheckResult.rows[0]?.exists) {
      return json({ error: `Table '${table}' not found` }, { status: 404 });
    }

    // Get column information
    const columnsResult = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);

    // Fetch rows with pagination
    // Using parameterized query with identifier quoting for table name
    const rowsResult = await db.query(
      `SELECT * FROM "${table}" LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const countResult = await db.query(`SELECT COUNT(*) FROM "${table}"`);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    return json({
      columns: columnsResult.rows,
      rows: rowsResult.rows,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching rows:', error);
    return json({ 
      error: 'Failed to fetch rows', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  return json({ error: 'Method not allowed' }, { status: 405 });
}