import React, { useState, useRef, useEffect } from 'react';
import { notesActions } from '~/lib/stores/notes';
import type { Note } from '~/lib/stores/notes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface NoteEditorProps {
  note: Note;
  onClose: () => void;
  onUpdate?: (updates: Partial<Note>) => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
}

export function NoteEditor({ note, onClose, onUpdate, onAddTag, onRemoveTag }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isPreview, setIsPreview] = useState(false);
  const [tags, setTags] = useState(note.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-save on content change
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (title !== note.title || content !== note.content) {
        if (onUpdate) {
          onUpdate({ title, content });
        } else {
          notesActions.updateNote(note.id, { title, content });
        }
      }
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [title, content, note.id, note.title, note.content, onUpdate]);


  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (onAddTag) {
        onAddTag(newTag.trim());
      } else {
        notesActions.addTag(note.id, newTag.trim());
      }
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (onRemoveTag) {
      onRemoveTag(tag);
    } else {
      notesActions.removeTag(note.id, tag);
    }
    setTags(tags.filter(t => t !== tag));
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const toolbarButtons = [
    { icon: 'B', action: () => insertMarkdown('**', '**'), title: 'Bold' },
    { icon: 'I', action: () => insertMarkdown('*', '*'), title: 'Italic' },
    { icon: 'H', action: () => insertMarkdown('## ', ''), title: 'Heading' },
    { icon: '—', action: () => insertMarkdown('\n---\n', ''), title: 'Divider' },
    { icon: '•', action: () => insertMarkdown('\n- ', ''), title: 'Bullet List' },
    { icon: '1.', action: () => insertMarkdown('\n1. ', ''), title: 'Numbered List' },
    { icon: '[ ]', action: () => insertMarkdown('- [ ] ', ''), title: 'Checkbox' },
    { icon: '"', action: () => insertMarkdown('\n> ', ''), title: 'Quote' },
    { icon: '<>', action: () => insertMarkdown('`', '`'), title: 'Code' },
    { icon: '```', action: () => insertMarkdown('\n```\n', '\n```\n'), title: 'Code Block' },
    { icon: '🔗', action: () => insertMarkdown('[', '](url)'), title: 'Link' },
  ];

  return (
    <div className="h-full flex flex-col bg-bolt-elements-background-depth-2">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
        <div className="flex-1 mr-4">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingTitle(false);
                }
              }}
              className="text-lg font-semibold bg-transparent border-b border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:border-bolt-elements-focus w-full"
              autoFocus
            />
          ) : (
            <h2
              onClick={() => setIsEditingTitle(true)}
              className="text-lg font-semibold text-bolt-elements-textPrimary cursor-pointer hover:text-bolt-elements-textSecondary"
            >
              {title}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`px-3 py-1 rounded transition-colors ${
              isPreview
                ? 'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary'
                : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
            }`}
          >
            {isPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {!isPreview && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-bolt-elements-borderColor overflow-x-auto">
          {toolbarButtons.map((button, index) => (
            <button
              key={index}
              onClick={button.action}
              className="px-2 py-1 text-sm font-mono hover:bg-bolt-elements-background-depth-3 rounded transition-colors whitespace-nowrap"
              title={button.title}
            >
              {button.icon}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isPreview ? (
          <div className="h-full overflow-y-auto p-4 prose prose-invert max-w-none prose-pre:bg-bolt-elements-background-depth-3 prose-code:text-bolt-elements-textPrimary">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-4 bg-transparent text-bolt-elements-textPrimary resize-none focus:outline-none font-mono text-sm"
            placeholder="Start typing your note in Markdown..."
            autoFocus
          />
        )}
      </div>

      {/* Tags */}
      <div className="p-4 border-t border-bolt-elements-borderColor">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-bolt-elements-textSecondary">Tags:</span>
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-bolt-elements-background-depth-1 rounded-full"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Add tag..."
            className="flex-1 min-w-[100px] px-2 py-1 text-xs bg-transparent border border-bolt-elements-borderColor rounded focus:outline-none focus:border-bolt-elements-focus"
          />
        </div>
      </div>
    </div>
  );
}