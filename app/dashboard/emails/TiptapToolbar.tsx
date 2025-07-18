"use client";
import React from "react";
import { Editor } from "@tiptap/react";

interface ToolbarProps {
  editor: Editor | null;
}

export default function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b py-2 px-1 bg-gray-50 rounded-t">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'font-bold text-blue-600' : ''}
        aria-label="Bold"
      >
        <b>B</b>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'italic text-blue-600' : ''}
        aria-label="Italic"
      >
        <i>I</i>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'line-through text-blue-600' : ''}
        aria-label="Strikethrough"
      >
        S
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'text-blue-600' : ''}
        aria-label="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'text-blue-600' : ''}
        aria-label="Numbered List"
      >
        1. List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'text-blue-600' : ''}
        aria-label="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'text-blue-600' : ''}
        aria-label="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={editor.isActive('paragraph') ? 'text-blue-600' : ''}
        aria-label="Paragraph"
      >
        ¶
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        aria-label="Undo"
      >
        ⎌
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        aria-label="Redo"
      >
        ↻
      </button>
    </div>
  );
}
