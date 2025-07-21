import React from 'react';
import AiChat from '../../../components/AiChat';

// For demo: generate a random conversation ID (replace with real logic in prod)
const conversationId = typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString();

export default function AiChatPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center py-10">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">AI Internal Chat</h1>
      <AiChat conversationId={conversationId} />
    </div>
  );
}
