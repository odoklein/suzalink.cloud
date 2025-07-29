import React, { useEffect, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({ value, onChange, placeholder = '', className = '' }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `focus:outline-none min-h-[200px] w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white ${className}`,
        placeholder,
      },
    },
  });

  // Keep editor in sync if value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '<p></p>', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Cleanup
  useEffect(() => () => editor?.destroy(), [editor]);

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar can be added here if needed */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;
