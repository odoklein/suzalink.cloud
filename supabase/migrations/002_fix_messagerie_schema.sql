-- =====================================================
-- FIX MESSAGERIE SCHEMA ISSUES
-- =====================================================

-- 1. Add missing profile_picture_url column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- 2. Add missing columns to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- 3. Rename message_participants to conversation_participants (API expects this name)
ALTER TABLE public.message_participants RENAME TO conversation_participants;

-- Rename the constraints to match the new table name
ALTER TABLE public.conversation_participants 
RENAME CONSTRAINT message_participants_pkey TO conversation_participants_pkey;

ALTER TABLE public.conversation_participants 
RENAME CONSTRAINT message_participants_conversation_user_key TO conversation_participants_conversation_user_key;

ALTER TABLE public.conversation_participants 
RENAME CONSTRAINT message_participants_conversation_id_fkey TO conversation_participants_conversation_id_fkey;

ALTER TABLE public.conversation_participants 
RENAME CONSTRAINT message_participants_user_id_fkey TO conversation_participants_user_id_fkey;

-- Rename the indexes to match the new table name
ALTER INDEX IF EXISTS idx_message_participants_conversation_id RENAME TO idx_conversation_participants_conversation_id;
ALTER INDEX IF EXISTS idx_message_participants_user_id RENAME TO idx_conversation_participants_user_id;

-- 4. Add missing columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS message_reads jsonb DEFAULT '[]';

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_is_archived ON public.conversations(is_archived);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_message_reads ON public.messages USING gin(message_reads);

-- 6. Update existing conversations to have proper type and archived status
UPDATE public.conversations 
SET type = CASE 
    WHEN is_group = true THEN 'group' 
    ELSE 'direct' 
END,
is_archived = false
WHERE type IS NULL OR is_archived IS NULL;

-- 7. Add trigger to update conversations updated_at when messages are added
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.sent_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_conversation_last_message') THEN
        CREATE TRIGGER trigger_update_conversation_last_message
        AFTER INSERT ON public.messages
        FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
    END IF;
END $$;
