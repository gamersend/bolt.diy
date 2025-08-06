import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Note } from '~/lib/stores/notes';

interface DbNotesListProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
}

export function DbNotesList({ notes, activeNoteId, onSelectNote, onDeleteNote, onTogglePin }: DbNotesListProps) {
  const handleDeleteNote = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      onDeleteNote(noteId);
    }
  };

  const handleTogglePin = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    onTogglePin(noteId);
  };

  const truncateContent = (content: string, maxLength = 100) => {
    const plainText = content.replace(/[#*`_~\[\]()]/g, '').trim();
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-bolt-elements-textSecondary">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-lg font-semibold mb-2">No notes yet</p>
            <p className="text-sm">Create your first note to get started</p>
            <p className="text-xs mt-4 text-purple-400">Powered by PostgreSQL ∞</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className={`p-3 rounded-lg cursor-pointer transition-all transform hover:scale-[1.02] ${
                activeNoteId === note.id
                  ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 ring-2 ring-purple-500'
                  : 'bg-bolt-elements-background-depth-3 hover:bg-gradient-to-r hover:from-purple-600/10 hover:to-pink-600/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {note.isPinned && (
                      <span className="text-purple-400">📌</span>
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
                            className="text-xs px-2 py-0.5 bg-purple-500/20 rounded-full text-purple-400"
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
                    className="p-1.5 rounded hover:bg-purple-500/20 transition-colors"
                    title={note.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <svg
                      className={`w-4 h-4 ${
                        note.isPinned
                          ? 'text-purple-400'
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
                    className="p-1.5 rounded hover:bg-red-500/20 hover:text-red-500 transition-colors"
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