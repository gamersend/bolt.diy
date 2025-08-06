-- Database schema for Bolt DIY Infinity Tools

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Note',
    content TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN DEFAULT false,
    user_id VARCHAR(255) DEFAULT 'default', -- For future multi-user support
    CONSTRAINT notes_user_id_check CHECK (user_id IS NOT NULL)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);

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

-- Create secrets/API keys table
CREATE TABLE IF NOT EXISTS secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    key_type VARCHAR(50) NOT NULL, -- 'api_key', 'secret', 'token', 'password', etc.
    key_value TEXT NOT NULL, -- Encrypted in production
    description TEXT,
    service_name VARCHAR(255), -- e.g., 'OpenAI', 'GitHub', 'AWS'
    environment VARCHAR(50) DEFAULT 'development', -- 'development', 'staging', 'production'
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255) DEFAULT 'default',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}', -- Additional flexible data storage
    CONSTRAINT secrets_user_id_check CHECK (user_id IS NOT NULL)
);

-- Create index for secrets
CREATE INDEX IF NOT EXISTS idx_secrets_user_id ON secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_secrets_service_name ON secrets(service_name);
CREATE INDEX IF NOT EXISTS idx_secrets_key_type ON secrets(key_type);
CREATE INDEX IF NOT EXISTS idx_secrets_is_active ON secrets(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_secrets_updated_at BEFORE UPDATE ON secrets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for notes with tags
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
GROUP BY n.id, n.title, n.content, n.created_at, n.updated_at, n.is_pinned, n.user_id;

-- Sample data (optional - remove in production)
-- INSERT INTO notes (title, content) VALUES 
-- ('Welcome to Infinity Tools', '# Welcome!\n\nThis is your first note in the Infinity Tools notes system.'),
-- ('Markdown Example', '## Markdown Support\n\n- **Bold text**\n- *Italic text*\n- `Code snippets`\n\n```javascript\nconsole.log("Hello, World!");\n```');

-- INSERT INTO secrets (name, key_type, key_value, service_name, description) VALUES
-- ('OpenAI API Key', 'api_key', 'sk-...', 'OpenAI', 'API key for GPT models'),
-- ('GitHub Token', 'token', 'ghp_...', 'GitHub', 'Personal access token for GitHub API');