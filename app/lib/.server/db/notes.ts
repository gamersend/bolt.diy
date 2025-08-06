import { query, withTransaction, isDatabaseAvailable } from './index';
import type { Note } from '~/lib/stores/notes';

export interface DbNote {
  id: string;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  is_pinned: boolean;
  user_id: string;
  tags?: string[];
}

export class NotesDatabase {
  private userId: string;

  constructor(userId: string = 'default') {
    this.userId = userId;
  }

  async getAllNotes(): Promise<Note[]> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const rows = await query<DbNote>(`
      SELECT * FROM notes_with_tags 
      WHERE user_id = $1 
      ORDER BY is_pinned DESC, updated_at DESC
    `, [this.userId]);

    return rows.map(this.mapDbNoteToNote);
  }

  async getNote(id: string): Promise<Note | null> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const rows = await query<DbNote>(`
      SELECT * FROM notes_with_tags 
      WHERE id = $1 AND user_id = $2
    `, [id, this.userId]);

    return rows[0] ? this.mapDbNoteToNote(rows[0]) : null;
  }

  async createNote(title: string = 'Untitled Note', content: string = ''): Promise<Note> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const rows = await query<DbNote>(`
      INSERT INTO notes (title, content, user_id) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [title, content, this.userId]);

    return this.mapDbNoteToNote(rows[0]);
  }

  async updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'isPinned'>>): Promise<Note> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }

    if (updates.content !== undefined) {
      setClauses.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }

    if (updates.isPinned !== undefined) {
      setClauses.push(`is_pinned = $${paramCount++}`);
      values.push(updates.isPinned);
    }

    values.push(id, this.userId);

    const rows = await query<DbNote>(`
      UPDATE notes 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `, values);

    if (rows.length === 0) {
      throw new Error('Note not found');
    }

    // Fetch with tags
    return this.getNote(id) as Promise<Note>;
  }

  async deleteNote(id: string): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    await query(`
      DELETE FROM notes 
      WHERE id = $1 AND user_id = $2
    `, [id, this.userId]);
  }

  async addTag(noteId: string, tagName: string): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    await withTransaction(async (client) => {
      // First, ensure the tag exists
      const tagRows = await client.query(`
        INSERT INTO tags (name) 
        VALUES ($1) 
        ON CONFLICT (name) DO UPDATE SET name = $1
        RETURNING id
      `, [tagName.toLowerCase()]);

      const tagId = tagRows.rows[0].id;

      // Then, link it to the note
      await client.query(`
        INSERT INTO note_tags (note_id, tag_id) 
        VALUES ($1, $2) 
        ON CONFLICT DO NOTHING
      `, [noteId, tagId]);
    });
  }

  async removeTag(noteId: string, tagName: string): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    await query(`
      DELETE FROM note_tags 
      WHERE note_id = $1 AND tag_id = (
        SELECT id FROM tags WHERE name = $2
      )
    `, [noteId, tagName.toLowerCase()]);
  }

  async searchNotes(searchQuery: string): Promise<Note[]> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const rows = await query<DbNote>(`
      SELECT DISTINCT n.* FROM notes_with_tags n
      WHERE n.user_id = $1 
        AND (
          n.title ILIKE $2 
          OR n.content ILIKE $2 
          OR EXISTS (
            SELECT 1 FROM note_tags nt 
            JOIN tags t ON nt.tag_id = t.id 
            WHERE nt.note_id = n.id AND t.name ILIKE $2
          )
        )
      ORDER BY n.is_pinned DESC, n.updated_at DESC
    `, [this.userId, `%${searchQuery}%`]);

    return rows.map(this.mapDbNoteToNote);
  }

  private mapDbNoteToNote(dbNote: DbNote): Note {
    return {
      id: dbNote.id,
      title: dbNote.title,
      content: dbNote.content,
      createdAt: dbNote.created_at.toISOString(),
      updatedAt: dbNote.updated_at.toISOString(),
      isPinned: dbNote.is_pinned,
      tags: dbNote.tags || [],
    };
  }
}