import React, { useRef, useEffect } from 'react';

interface SimpleTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const BUTTONS = [
  { cmd: 'bold', icon: <b>B</b>, label: 'Bold' },
  { cmd: 'italic', icon: <i>I</i>, label: 'Italic' },
  { cmd: 'underline', icon: <u>U</u>, label: 'Underline' },
  { cmd: 'insertUnorderedList', icon: <span>&bull;•</span>, label: 'Bulleted List' },
  { cmd: 'insertOrderedList', icon: <span>1.</span>, label: 'Numbered List' },
  { cmd: 'removeFormat', icon: <span className="line-through">Tx</span>, label: 'Clear' },
  { cmd: 'formatBlock', arg: 'H1', icon: <span className="font-bold text-base">H1</span>, label: 'Heading 1' },
  { cmd: 'formatBlock', arg: 'H2', icon: <span className="font-bold text-base">H2</span>, label: 'Heading 2' },
  { cmd: 'formatBlock', arg: 'H3', icon: <span className="font-bold text-base">H3</span>, label: 'Heading 3' },
  { cmd: 'formatBlock', arg: 'P', icon: <span className="font-medium text-base">P</span>, label: 'Paragraph' },
];

const SimpleTextEditor: React.FC<SimpleTextEditorProps> = ({ value, onChange, placeholder = '', className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only update if value is different (avoid caret jump)
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (ref.current) {
      onChange(ref.current.innerHTML);
    }
  };

  const handleCommand = (cmd: string, arg?: string) => {
    if (cmd === 'formatBlock' && arg) {
      document.execCommand('formatBlock', false, arg);
    } else {
      document.execCommand(cmd, false);
    }
    handleInput();
    ref.current?.focus();
  };

  return (
    <div className={"flex flex-col gap-2 " + className}>
      <div className="flex flex-wrap gap-1 border rounded-md bg-gray-50 px-2 py-1 mb-1">
        {BUTTONS.map(btn => (
          <button
            key={btn.cmd + (btn.arg || '')}
            type="button"
            title={btn.label}
            className="px-2 py-1 rounded hover:bg-blue-100 text-gray-700 text-sm"
            onMouseDown={e => { e.preventDefault(); handleCommand(btn.cmd, btn.arg); }}
          >
            {btn.icon}
          </button>
        ))}
      </div>
      <div className="relative flex-1">
        {(!value || value === '<br>' || value === '<p><br></p>') && (
          <span className="pointer-events-none absolute left-3 top-2 text-gray-400 select-none text-sm">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          className="flex-1 min-h-[120px] max-h-96 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white prose-sm overflow-auto"
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          suppressContentEditableWarning
          spellCheck={true}
          aria-label={placeholder}
          tabIndex={0}
          style={{ minHeight: 120 }}
        />
      </div>
    </div>
  );
};

export default SimpleTextEditor;
