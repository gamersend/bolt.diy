// PostgreSQL Database Connection
// Note: You'll need to install the 'pg' package: npm install pg @types/pg

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// Database configuration from environment or hardcoded (for development)
export const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || '192.168.0.150',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'custombolt',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Qzmpwxno1',
};

// For production, you should use environment variables instead of hardcoding credentials
// Create a .env file with:
// DB_HOST=192.168.0.150
// DB_PORT=5432
// DB_NAME=custombolt
// DB_USER=postgres
// DB_PASSWORD=Qzmpwxno1

let pgModule: any = null;
let isPostgresAvailable = false;

// Dynamic import to handle environments where pg is not available
export async function initializeDatabase() {
  try {
    if (typeof process === 'undefined' || !process.versions?.node) {
      console.log('Not in Node.js environment, PostgreSQL unavailable');
      return null;
    }

    // Try to dynamically import pg
    pgModule = await import('pg');
    const { Pool } = pgModule;
    
    const pool = new Pool(dbConfig);
    
    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    isPostgresAvailable = true;
    console.log('PostgreSQL connection established successfully');
    
    return pool;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    isPostgresAvailable = false;
    return null;
  }
}

// Singleton pool instance
let poolInstance: any = null;

export async function getPool() {
  if (!poolInstance && !isPostgresAvailable) {
    poolInstance = await initializeDatabase();
  }
  return poolInstance;
}

// Helper function to check if PostgreSQL is available
export function isDatabaseAvailable(): boolean {
  return isPostgresAvailable && poolInstance !== null;
}

// Query helper with error handling
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = await getPool();
  if (!pool) {
    throw new Error('PostgreSQL is not available');
  }

  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = await getPool();
  if (!pool) {
    throw new Error('PostgreSQL is not available');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}