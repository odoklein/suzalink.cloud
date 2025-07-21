"use client";
import React, { useState } from "react";
import { useAuth } from '@/lib/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Toolbar from './TiptapToolbar';
import EmailAttachmentInput from "./EmailAttachmentInput";

interface ComposeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}

export default function ComposeEmailModal({ open, onOpenChange, onSent }: ComposeEmailModalProps) {
  const { user } = useAuth();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Accessibility: live region for status
  const [statusMsg, setStatusMsg] = useState("");

  // Tiptap editor instance
  const editor = useEditor({
    extensions: [StarterKit],
    content: body,
    onUpdate: ({ editor }) => setBody(editor.getHTML()),
    editorProps: {
      attributes: {
        'aria-label': 'Email body',
        'role': 'textbox',
      },
    },
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(false);
    setStatusMsg("");
    try {
      // Prepare form data for attachments
      const formData = new FormData();
      // Add sender email as 'from' (from auth context)
      formData.append("from", user?.email || "");
      formData.append("to", to);
      formData.append("subject", subject);
      formData.append("body", body);
      if (cc) formData.append("cc", cc);
      if (bcc) formData.append("bcc", bcc);
      attachments.forEach((file, i) => formData.append("attachments", file));
      const res = await fetch("/api/emails/send", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send email");
        setStatusMsg(data.error || "Failed to send email");
      } else {
        setSuccess(true);
        setStatusMsg("Email sent!");
        setTo("");
        setSubject("");
        setBody("");
        setCc("");
        setBcc("");
        setAttachments([]);
        if (editor) editor.commands.setContent("");
        if (onSent) onSent();
        setTimeout(() => {
          setSuccess(false);
          setStatusMsg("");
          onOpenChange(false);
        }, 1200);
      }
    } catch {
      setError("Failed to send email");
      setStatusMsg("Failed to send email");
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSend} className="space-y-4" aria-label="Compose email">
          <div>
            <label htmlFor="to" className="block text-sm font-medium mb-1">To</label>
            <input
              id="to"
              type="email"
              className="border rounded w-full px-3 py-2"
              value={to}
              onChange={e => setTo(e.target.value)}
              required
              disabled={sending}
              aria-required="true"
            />
          </div>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setShowCc(v => !v)} className="underline text-blue-600">CC</button>
            <button type="button" onClick={() => setShowBcc(v => !v)} className="underline text-blue-600">BCC</button>
          </div>
          {showCc && (
            <div>
              <label htmlFor="cc" className="block text-sm font-medium mb-1">CC</label>
              <input
                id="cc"
                type="email"
                className="border rounded w-full px-3 py-2"
                value={cc}
                onChange={e => setCc(e.target.value)}
                disabled={sending}
                aria-label="CC"
              />
            </div>
          )}
          {showBcc && (
            <div>
              <label htmlFor="bcc" className="block text-sm font-medium mb-1">BCC</label>
              <input
                id="bcc"
                type="email"
                className="border rounded w-full px-3 py-2"
                value={bcc}
                onChange={e => setBcc(e.target.value)}
                disabled={sending}
                aria-label="BCC"
              />
            </div>
          )}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-1">Subject</label>
            <input
              id="subject"
              type="text"
              className="border rounded w-full px-3 py-2"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              disabled={sending}
              aria-required="true"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Body</label>
            <div className="border rounded min-h-[300px] bg-white focus-within:ring-2">
              <Toolbar editor={editor} />
              <EditorContent editor={editor} />
            </div>
          </div>
          <EmailAttachmentInput attachments={attachments} setAttachments={setAttachments} />
          <div aria-live="polite" className="sr-only">{statusMsg}</div>
          {error && <div className="text-red-500 text-sm" aria-live="assertive">{error}</div>}
          {success && <div className="text-green-600 text-sm" aria-live="polite">Email sent!</div>}
          <DialogFooter>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={sending}
            >
              {sending ? "Sending..." : "Send"}
            </button>
            <DialogClose asChild>
              <button type="button" className="ml-2 px-4 py-2 rounded border">Cancel</button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
