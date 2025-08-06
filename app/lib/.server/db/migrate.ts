import { getPool, isDatabaseAvailable } from './index';
import fs from 'fs/promises';
import path from 'path';

export async function runMigrations() {
  if (!isDatabaseAvailable()) {
    console.log('PostgreSQL not available, skipping migrations');
    return false;
  }

  const pool = await getPool();
  if (!pool) {
    console.error('Failed to get database pool');
    return false;
  }

  try {
    console.log('Running database migrations...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('Database migrations completed successfully');
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    
    // If it's a file system error, try with inline schema
    if (error instanceof Error && error.message.includes('ENOENT')) {
      console.log('Schema file not found, using inline schema...');
      try {
        await pool.query(getInlineSchema());
        console.log('Database migrations completed with inline schema');
        return true;
      } catch (inlineError) {
        console.error('Inline migration error:', inlineError);
        return false;
      }
    }
    
    return false;
  }
}

// Inline schema as fallback
function getInlineSchema() {
  return `
    -- Create notes table
    CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL DEFAULT 'Untitled Note',
        content TEXT DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_pinned BOOLEAN DEFAULT false,
        user_id VARCHAR(255) DEFAULT 'default'
    );

    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

    -- Create tags table
    CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT tags_name_unique UNIQUE (name)
    );

    -- Create note_tags junction table
    CREATE TABLE IF NOT EXISTS note_tags (
        note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
        tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (note_id, tag_id)
    );

    -- Create secrets table
    CREATE TABLE IF NOT EXISTS secrets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        key_type VARCHAR(50) NOT NULL,
        key_value TEXT NOT NULL,
        description TEXT,
        service_name VARCHAR(255),
        environment VARCHAR(50) DEFAULT 'development',
        expires_at TIMESTAMP WITH TIME ZONE,
        last_used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(255) DEFAULT 'default',
        is_active BOOLEAN DEFAULT true,
        metadata JSONB DEFAULT '{}'
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_secrets_user_id ON secrets(user_id);
    CREATE INDEX IF NOT EXISTS idx_secrets_service_name ON secrets(service_name);

    -- Create update trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Create triggers
    DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
    CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_secrets_updated_at ON secrets;
    CREATE TRIGGER update_secrets_updated_at BEFORE UPDATE ON secrets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Create view
    CREATE OR REPLACE VIEW notes_with_tags AS
    SELECT 
        n.id,
        n.title,
        n.content,
        n.created_at,
        n.updated_at,
        n.is_pinned,
        n.user_id,
        COALESCE(
            array_agg(
                DISTINCT t.name ORDER BY t.name
            ) FILTER (WHERE t.name IS NOT NULL), 
            ARRAY[]::varchar[]
        ) AS tags
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    GROUP BY n.id;
  `;
}