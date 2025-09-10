-- =====================================================
-- COMPLETE MESSAGERIE SCHEMA FIX
-- =====================================================

-- 1. Create message_reads table (referenced in API but missing)
CREATE TABLE IF NOT EXISTS public.message_reads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_reads_pkey PRIMARY KEY (id),
  CONSTRAINT message_reads_message_user_key UNIQUE (message_id, user_id),
  CONSTRAINT message_reads_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
  CONSTRAINT message_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 2. Create message_attachments table (referenced in API but missing)
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id uuid,
  filename text NOT NULL,
  file_url text NOT NULL,
  file_size integer NOT NULL,
  content_type text NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
  CONSTRAINT message_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 3. Fix messages table - remove the jsonb message_reads column and add missing columns
ALTER TABLE public.messages 
DROP COLUMN IF EXISTS message_reads,
ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- 4. Add missing columns to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- 5. Add missing columns to users table for presence
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_picture_url text,
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;

-- 6. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_uploaded_by ON public.message_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_is_archived ON public.conversations(is_archived);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);



-- 13. Create function to update conversation updated_at when message is sent
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET updated_at = NEW.sent_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create trigger to automatically update conversation timestamp
DROP TRIGGER IF EXISTS trigger_update_conversation_updated_at ON public.messages;
CREATE TRIGGER trigger_update_conversation_updated_at
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- 15. Create function to automatically mark messages as read when user views conversation
CREATE OR REPLACE FUNCTION mark_messages_as_read()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called from the application when user opens a conversation
  -- For now, we'll just return the new record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
