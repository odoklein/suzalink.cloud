"use client";

import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Link,
  Unlink,
  List,
  ListOrdered
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing your email content...",
  className = ""
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertLink = useCallback(() => {
    const url = prompt('Enter the URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  }, [executeCommand]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          executeCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          executeCommand('italic');
          break;
      }
    }
  }, [executeCommand]);

  return (
    <div className={`border border-gray-300 rounded-md ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('bold')}
          className="p-1 h-8 w-8"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('italic')}
          className="p-1 h-8 w-8"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          className="p-1 h-8 w-8"
          title="Insert Link"
        >
          <Link className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('unlink')}
          className="p-1 h-8 w-8"
          title="Remove Link"
        >
          <Unlink className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-1 h-8 w-8"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('insertOrderedList')}
          className="p-1 h-8 w-8"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none"
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
      />

      {/* Custom styles for placeholder */}
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

