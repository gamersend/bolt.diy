import React, { useState, useEffect } from 'react';
import { useDbNotes } from '~/lib/hooks/useDbNotes';
import { NoteEditor } from './NoteEditor';
import { DbNotesList } from './DbNotesList';
import type { Note } from '~/lib/stores/notes';

export function DbNotesPanel() {
  const { notes, loading, error, usingFallback, loadNotes, createNote, updateNote, deleteNote, addTag, removeTag } = useDbNotes();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  // Auto-show editor when a note is selected
  useEffect(() => {
    if (activeNoteId) {
      setShowEditor(true);
    }
  }, [activeNoteId]);

  const handleCreateNote = async () => {
    const newNote = await createNote();
    if (newNote) {
      setActiveNoteId(newNote.id);
      setShowEditor(true);
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setActiveNoteId(null);
  };

  const handleSelectNote = (note: Note) => {
    setActiveNoteId(note.id);
    setShowEditor(true);
  };

  const handleSearch = () => {
    loadNotes(searchQuery);
  };

  const handleExportNotes = () => {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infinity-notes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpdateNote = async (noteId: string, updates: Partial<Note>) => {
    await updateNote(noteId, updates);
  };

  const handleAddTag = async (noteId: string, tag: string) => {
    await addTag(noteId, tag);
  };

  const handleRemoveTag = async (noteId: string, tag: string) => {
    await removeTag(noteId, tag);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Actions */}
      <div className="p-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full px-4 py-2 pl-10 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-bolt-elements-textTertiary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCreateNote}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Note
          </button>

          <button
            onClick={handleExportNotes}
            className="p-2 rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors"
            title="Export Notes"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {usingFallback && (
          <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm">
            Using local storage. PostgreSQL not available.
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-bolt-elements-textSecondary">Loading notes...</div>
          </div>
        ) : (
          <>
            {/* Notes List */}
            <DbNotesList 
              notes={notes}
              activeNoteId={activeNoteId}
              onSelectNote={handleSelectNote}
              onDeleteNote={deleteNote}
              onTogglePin={async (noteId) => {
                const note = notes.find(n => n.id === noteId);
                if (note) {
                  await updateNote(noteId, { isPinned: !note.isPinned });
                }
              }}
            />

            {/* Note Editor Modal */}
            {showEditor && activeNote && (
              <div className="absolute inset-0 bg-bolt-elements-background-depth-2 z-10">
                <NoteEditor
                  note={activeNote}
                  onClose={handleCloseEditor}
                  onUpdate={(updates) => handleUpdateNote(activeNote.id, updates)}
                  onAddTag={(tag) => handleAddTag(activeNote.id, tag)}
                  onRemoveTag={(tag) => handleRemoveTag(activeNote.id, tag)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}