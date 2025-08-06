import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getDb } from '~/lib/.server/db';
import { z } from 'zod';

// GET /api/db/tables - Get list of all tables
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const db = await getDb();
    if (!db) {
      return json({ error: 'Database connection not available' }, { status: 503 });
    }

    // Query to get all table names from the public schema
    const result = await db.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const tables = result.rows.map(row => row.tablename);
    
    return json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return json({ 
      error: 'Failed to fetch tables', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  return json({ error: 'Method not allowed' }, { status: 405 });
}