"use client";
import React, { useRef } from "react";

interface AttachmentInputProps {
  attachments: File[];
  setAttachments: (files: File[]) => void;
}

export default function EmailAttachmentInput({ attachments, setAttachments }: AttachmentInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setAttachments([...attachments, ...Array.from(e.target.files)]);
  }

  function removeAttachment(idx: number) {
    setAttachments(attachments.filter((_, i) => i !== idx));
  }

  return (
    <div className="mb-2">
      <label className="block text-sm font-medium mb-1">Attachments</label>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <button
        type="button"
        className="border px-3 py-1 rounded text-sm mb-2"
        onClick={() => fileInputRef.current?.click()}
      >
        Add Attachment
      </button>
      <ul className="text-xs text-gray-600 mt-1">
        {attachments.map((file, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <span>{file.name}</span>
            <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
