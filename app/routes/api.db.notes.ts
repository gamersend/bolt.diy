import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { NotesDatabase } from '~/lib/.server/db/notes';
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
    const noteId = url.searchParams.get('id');
    const search = url.searchParams.get('search');
    
    const notesDb = new NotesDatabase();
    
    if (noteId) {
      const note = await notesDb.getNote(noteId);
      if (!note) {
        return json({ error: 'Note not found' }, { status: 404 });
      }
      return json({ note });
    }
    
    if (search) {
      const notes = await notesDb.searchNotes(search);
      return json({ notes });
    }
    
    const notes = await notesDb.getAllNotes();
    return json({ notes });
  } catch (error) {
    console.error('Notes API error:', error);
    
    // Fallback to localStorage data if DB is unavailable
    if (error instanceof Error && error.message === 'Database not available') {
      return json({ 
        notes: [],
        fallback: true,
        message: 'Using local storage. PostgreSQL not available.'
      });
    }
    
    return json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    await ensureDbInitialized();
    
    const formData = await request.formData();
    const action = formData.get('action') as string;
    const notesDb = new NotesDatabase();
    
    switch (action) {
      case 'create': {
        const title = formData.get('title') as string || 'Untitled Note';
        const content = formData.get('content') as string || '';
        
        const note = await notesDb.createNote(title, content);
        return json({ note });
      }
      
      case 'update': {
        const id = formData.get('id') as string;
        const updates: any = {};
        
        if (formData.has('title')) updates.title = formData.get('title');
        if (formData.has('content')) updates.content = formData.get('content');
        if (formData.has('isPinned')) updates.isPinned = formData.get('isPinned') === 'true';
        
        const note = await notesDb.updateNote(id, updates);
        return json({ note });
      }
      
      case 'delete': {
        const id = formData.get('id') as string;
        await notesDb.deleteNote(id);
        return json({ success: true });
      }
      
      case 'addTag': {
        const noteId = formData.get('noteId') as string;
        const tag = formData.get('tag') as string;
        
        await notesDb.addTag(noteId, tag);
        const note = await notesDb.getNote(noteId);
        return json({ note });
      }
      
      case 'removeTag': {
        const noteId = formData.get('noteId') as string;
        const tag = formData.get('tag') as string;
        
        await notesDb.removeTag(noteId, tag);
        const note = await notesDb.getNote(noteId);
        return json({ note });
      }
      
      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Notes API action error:', error);
    
    // Fallback response for DB unavailable
    if (error instanceof Error && error.message === 'Database not available') {
      return json({ 
        error: 'Database not available. Please use local storage.',
        fallback: true
      }, { status: 503 });
    }
    
    return json({ error: 'Failed to perform action' }, { status: 500 });
  }
}