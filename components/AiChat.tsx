"use client";

import React, { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import AiChatFeedback from './AiChatFeedback';

interface Message {
  id: string;
  sender_type: 'user' | 'ai';
  content: string;
}

export default function AiChat({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { session } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!session) {
    return <div className="p-4 text-red-500">Please log in to use the AI chat.</div>;
  }


  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!session?.access_token) {
      setError('You must be logged in to chat.');
      return;
    }
    setLoading(true);
    setError('');
    const userMsg: Message = {
      id: Math.random().toString(),
      sender_type: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ conversation_id: conversationId, message: userMsg.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setMessages((prev) => [...prev, { ...data.aiMsg, sender_type: 'ai' }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto border rounded-lg shadow bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, idx) => (
  <div key={idx} className={`flex flex-col ${msg.sender_type === 'user' ? 'items-end' : 'items-start'}`}>
    <div className={`rounded-xl px-4 py-2 max-w-[75%] text-sm ${msg.sender_type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
      {msg.content}
    </div>
    {msg.sender_type === 'ai' && (
      <div className="ml-1">
        {/* Feedback stars for AI messages */}
        <AiChatFeedback messageId={msg.id} />
      </div>
    )}
  </div>
))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-2 bg-gray-200 dark:bg-gray-700 animate-pulse text-gray-900 dark:text-gray-100">
              <span className="inline-block w-12 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
            </div>
          </div>
        )}
      </div>
      {error && <div className="text-red-500 text-xs px-4 pb-2">{error}</div>}
      <div className="flex items-center border-t p-2 gap-2">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 px-3 py-2 rounded border focus:outline-none focus:ring bg-gray-50 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
