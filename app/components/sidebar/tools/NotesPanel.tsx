import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { notesStore, notesActions, getFilteredNotes, getActiveNote } from '~/lib/stores/notes';
import { NoteEditor } from './NoteEditor';
import { NotesList } from './NotesList';
import type { Note } from '~/lib/stores/notes';

export function NotesPanel() {
  const { activeNoteId, searchQuery } = useStore(notesStore);
  const [showEditor, setShowEditor] = useState(false);
  const activeNote = getActiveNote();

  // Auto-show editor when a note is selected
  useEffect(() => {
    if (activeNoteId) {
      setShowEditor(true);
    }
  }, [activeNoteId]);

  const handleCreateNote = () => {
    const newNote = notesActions.createNote();
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    notesActions.setActiveNote(null);
  };

  const handleSelectNote = (note: Note) => {
    notesActions.setActiveNote(note.id);
    setShowEditor(true);
  };

  const handleExportNotes = () => {
    const data = notesActions.exportNotes();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bolt-notes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportNotes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        notesActions.importNotes(content);
        alert('Notes imported successfully!');
      } catch (error) {
        alert('Failed to import notes. Please check the file format.');
      }
    };
    reader.readAsText(file);
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
            onChange={(e) => notesActions.setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
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
            className="flex-1 px-4 py-2 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-lg hover:bg-bolt-elements-button-primary-backgroundHover transition-colors flex items-center justify-center gap-2"
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

          <label className="p-2 rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors cursor-pointer" title="Import Notes">
            <input
              type="file"
              accept=".json"
              onChange={handleImportNotes}
              className="hidden"
            />
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </label>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Notes List */}
        <NotesList onSelectNote={handleSelectNote} />

        {/* Note Editor Modal */}
        {showEditor && activeNote && (
          <div className="absolute inset-0 bg-bolt-elements-background-depth-2 z-10">
            <NoteEditor
              note={activeNote}
              onClose={handleCloseEditor}
            />
          </div>
        )}
      </div>
    </div>
  );
}