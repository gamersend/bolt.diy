import { useState, useCallback, useEffect } from 'react';
import type { Note } from '~/lib/stores/notes';

export function useDbNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Load notes
  const loadNotes = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/db/notes?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load notes');
      }

      setNotes(data.notes || []);
      setUsingFallback(data.fallback || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create note
  const createNote = useCallback(async (title: string = 'Untitled Note', content: string = ''): Promise<Note | null> => {
    try {
      const formData = new FormData();
      formData.append('action', 'create');
      formData.append('title', title);
      formData.append('content', content);

      const response = await fetch('/api/db/notes', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create note');
      }

      await loadNotes();
      return data.note;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
      return null;
    }
  }, [loadNotes]);

  // Update note
  const updateNote = useCallback(async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'isPinned'>>): Promise<Note | null> => {
    try {
      const formData = new FormData();
      formData.append('action', 'update');
      formData.append('id', id);
      
      if (updates.title !== undefined) formData.append('title', updates.title);
      if (updates.content !== undefined) formData.append('content', updates.content);
      if (updates.isPinned !== undefined) formData.append('isPinned', String(updates.isPinned));

      const response = await fetch('/api/db/notes', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update note');
      }

      await loadNotes();
      return data.note;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
      return null;
    }
  }, [loadNotes]);

  // Delete note
  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('id', id);

      const response = await fetch('/api/db/notes', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete note');
      }

      await loadNotes();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      return false;
    }
  }, [loadNotes]);

  // Add tag
  const addTag = useCallback(async (noteId: string, tag: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('action', 'addTag');
      formData.append('noteId', noteId);
      formData.append('tag', tag);

      const response = await fetch('/api/db/notes', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add tag');
      }

      await loadNotes();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag');
      return false;
    }
  }, [loadNotes]);

  // Remove tag
  const removeTag = useCallback(async (noteId: string, tag: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('action', 'removeTag');
      formData.append('noteId', noteId);
      formData.append('tag', tag);

      const response = await fetch('/api/db/notes', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove tag');
      }

      await loadNotes();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag');
      return false;
    }
  }, [loadNotes]);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return {
    notes,
    loading,
    error,
    usingFallback,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    addTag,
    removeTag,
  };
}