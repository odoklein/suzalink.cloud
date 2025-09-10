-- Add is_pinned field to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Add index for pinned messages queries
CREATE INDEX IF NOT EXISTS idx_messages_is_pinned ON public.messages(is_pinned) WHERE is_pinned = TRUE;

-- Add index for conversation pinned messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_pinned ON public.messages(conversation_id, is_pinned) WHERE is_pinned = TRUE;
