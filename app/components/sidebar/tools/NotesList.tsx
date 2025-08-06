import React from 'react';
import { useStore } from '@nanostores/react';
import { notesStore, notesActions, getFilteredNotes } from '~/lib/stores/notes';
import { formatDistanceToNow } from 'date-fns';
import type { Note } from '~/lib/stores/notes';

interface NotesListProps {
  onSelectNote: (note: Note) => void;
}

export function NotesList({ onSelectNote }: NotesListProps) {
  const { activeNoteId, sortBy, sortOrder } = useStore(notesStore);
  const notes = getFilteredNotes();

  const handleDeleteNote = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      notesActions.deleteNote(noteId);
    }
  };

  const handleTogglePin = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    notesActions.togglePin(noteId);
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      notesActions.setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      notesActions.setSortBy(field);
      notesActions.setSortOrder('desc');
    }
  };

  const truncateContent = (content: string, maxLength = 100) => {
    const plainText = content.replace(/[#*`_~\[\]()]/g, '').trim();
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sort Options */}
      <div className="px-4 pb-2 flex gap-2 text-xs">
        <button
          onClick={() => toggleSort('updatedAt')}
          className={`px-2 py-1 rounded transition-colors ${
            sortBy === 'updatedAt'
              ? 'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary'
              : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
          }`}
        >
          Updated {sortBy === 'updatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => toggleSort('createdAt')}
          className={`px-2 py-1 rounded transition-colors ${
            sortBy === 'createdAt'
              ? 'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary'
              : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
          }`}
        >
          Created {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => toggleSort('title')}
          className={`px-2 py-1 rounded transition-colors ${
            sortBy === 'title'
              ? 'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary'
              : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
          }`}
        >
          Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-bolt-elements-textSecondary">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>No notes yet</p>
            <p className="text-sm mt-1">Create your first note to get started</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                activeNoteId === note.id
                  ? 'bg-bolt-elements-background-depth-1 ring-2 ring-bolt-elements-focus'
                  : 'bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-2'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {note.isPinned && (
                      <svg
                        className="w-3 h-3 text-bolt-elements-textSecondary flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path
                          fillRule="evenodd"
                          d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a1 1 0 110 2H6a4 4 0 01-4-4V7a4 4 0 014-4h4a1 1 0 110 2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <h3 className="font-medium text-bolt-elements-textPrimary truncate">
                      {note.title}
                    </h3>
                  </div>
                  <p className="text-sm text-bolt-elements-textSecondary mt-1 line-clamp-2">
                    {truncateContent(note.content)}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-bolt-elements-textTertiary">
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                    </span>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex gap-1">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-bolt-elements-background-depth-1 rounded-full text-bolt-elements-textSecondary"
                          >
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-xs text-bolt-elements-textTertiary">
                            +{note.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => handleTogglePin(e, note.id)}
                    className="p-1 rounded hover:bg-bolt-elements-background-depth-2 transition-colors"
                    title={note.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <svg
                      className={`w-4 h-4 ${
                        note.isPinned
                          ? 'text-bolt-elements-textPrimary'
                          : 'text-bolt-elements-textTertiary'
                      }`}
                      fill={note.isPinned ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDeleteNote(e, note.id)}
                    className="p-1 rounded hover:bg-red-500/20 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}