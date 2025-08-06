import { map, atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { generateId } from '~/utils/fileUtils';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  isPinned?: boolean;
}

export interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  searchQuery: string;
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

// Persistent storage for notes
const persistentNotes = persistentAtom<Note[]>(
  'bolt-notes',
  [],
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

// Main notes store
export const notesStore = map<NotesState>({
  notes: persistentNotes.get(),
  activeNoteId: null,
  searchQuery: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
});

// Subscribe to persistent notes changes
persistentNotes.subscribe((notes) => {
  notesStore.setKey('notes', notes);
});

// CRUD Operations
export const notesActions = {
  // Create a new note
  createNote: (title: string = 'Untitled Note', content: string = ''): Note => {
    const newNote: Note = {
      id: generateId(),
      title,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      isPinned: false,
    };

    const currentNotes = notesStore.get().notes;
    const updatedNotes = [newNote, ...currentNotes];
    persistentNotes.set(updatedNotes);
    notesStore.setKey('activeNoteId', newNote.id);

    return newNote;
  },

  // Update an existing note
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): void => {
    const currentNotes = notesStore.get().notes;
    const noteIndex = currentNotes.findIndex(note => note.id === id);

    if (noteIndex === -1) {
      console.error(`Note with id ${id} not found`);
      return;
    }

    const updatedNote = {
      ...currentNotes[noteIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedNotes = [...currentNotes];
    updatedNotes[noteIndex] = updatedNote;
    persistentNotes.set(updatedNotes);
  },

  // Delete a note
  deleteNote: (id: string): void => {
    const currentNotes = notesStore.get().notes;
    const filteredNotes = currentNotes.filter(note => note.id !== id);
    persistentNotes.set(filteredNotes);

    // If the deleted note was active, clear the active note
    if (notesStore.get().activeNoteId === id) {
      notesStore.setKey('activeNoteId', null);
    }
  },

  // Set active note
  setActiveNote: (id: string | null): void => {
    notesStore.setKey('activeNoteId', id);
  },

  // Toggle pin status
  togglePin: (id: string): void => {
    const currentNotes = notesStore.get().notes;
    const noteIndex = currentNotes.findIndex(note => note.id === id);

    if (noteIndex === -1) return;

    const updatedNote = {
      ...currentNotes[noteIndex],
      isPinned: !currentNotes[noteIndex].isPinned,
      updatedAt: new Date().toISOString(),
    };

    const updatedNotes = [...currentNotes];
    updatedNotes[noteIndex] = updatedNote;
    persistentNotes.set(updatedNotes);
  },

  // Search notes
  setSearchQuery: (query: string): void => {
    notesStore.setKey('searchQuery', query);
  },

  // Sort notes
  setSortBy: (sortBy: NotesState['sortBy']): void => {
    notesStore.setKey('sortBy', sortBy);
  },

  setSortOrder: (order: NotesState['sortOrder']): void => {
    notesStore.setKey('sortOrder', order);
  },

  // Add tag to note
  addTag: (noteId: string, tag: string): void => {
    const currentNotes = notesStore.get().notes;
    const noteIndex = currentNotes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) return;

    const note = currentNotes[noteIndex];
    const tags = note.tags || [];
    
    if (!tags.includes(tag)) {
      const updatedNote = {
        ...note,
        tags: [...tags, tag],
        updatedAt: new Date().toISOString(),
      };

      const updatedNotes = [...currentNotes];
      updatedNotes[noteIndex] = updatedNote;
      persistentNotes.set(updatedNotes);
    }
  },

  // Remove tag from note
  removeTag: (noteId: string, tag: string): void => {
    const currentNotes = notesStore.get().notes;
    const noteIndex = currentNotes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) return;

    const note = currentNotes[noteIndex];
    const tags = note.tags || [];
    
    const updatedNote = {
      ...note,
      tags: tags.filter(t => t !== tag),
      updatedAt: new Date().toISOString(),
    };

    const updatedNotes = [...currentNotes];
    updatedNotes[noteIndex] = updatedNote;
    persistentNotes.set(updatedNotes);
  },

  // Export notes
  exportNotes: (): string => {
    const notes = notesStore.get().notes;
    return JSON.stringify(notes, null, 2);
  },

  // Import notes
  importNotes: (jsonString: string): void => {
    try {
      const importedNotes = JSON.parse(jsonString) as Note[];
      
      // Validate the imported data
      if (!Array.isArray(importedNotes)) {
        throw new Error('Invalid notes format');
      }

      // Merge with existing notes (avoid duplicates by ID)
      const currentNotes = notesStore.get().notes;
      const currentIds = new Set(currentNotes.map(n => n.id));
      
      const newNotes = importedNotes.filter(note => 
        note.id && 
        note.title && 
        note.content !== undefined &&
        !currentIds.has(note.id)
      );

      const mergedNotes = [...currentNotes, ...newNotes];
      persistentNotes.set(mergedNotes);
    } catch (error) {
      console.error('Failed to import notes:', error);
      throw error;
    }
  },
};

// Computed values
export const getFilteredNotes = (): Note[] => {
  const { notes, searchQuery, sortBy, sortOrder } = notesStore.get();
  
  // Filter by search query
  let filteredNotes = notes;
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredNotes = notes.filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }

  // Sort notes (pinned notes always first)
  filteredNotes.sort((a, b) => {
    // Pinned notes first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Then sort by selected criteria
    let comparison = 0;
    if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else {
      const aDate = new Date(a[sortBy]).getTime();
      const bDate = new Date(b[sortBy]).getTime();
      comparison = aDate - bDate;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return filteredNotes;
};

// Get active note
export const getActiveNote = (): Note | null => {
  const { notes, activeNoteId } = notesStore.get();
  if (!activeNoteId) return null;
  return notes.find(note => note.id === activeNoteId) || null;
};