import React, { useState } from 'react';

interface FeedbackProps {
  messageId: string;
  onSubmit?: () => void;
}

export default function AiChatFeedback({ messageId, onSubmit }: FeedbackProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    await fetch('/api/ai-chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, rating }),
    });
    setSubmitting(false);
    setSubmitted(true);
    onSubmit?.();
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`text-xl ${star <= (rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
          onClick={() => setRating(star)}
          disabled={submitting || submitted}
        >
          ★
        </button>
      ))}
      <button
        onClick={handleSubmit}
        disabled={!rating || submitting || submitted}
        className="ml-2 text-xs px-2 py-1 rounded bg-blue-500 text-white disabled:opacity-50"
      >
        {submitted ? 'Thank you!' : submitting ? 'Sending...' : 'Submit'}
      </button>
    </div>
  );
}
