-- =====================================================
-- ADD READ STATUS POLICIES AND FUNCTIONS
-- =====================================================

-- 1. Enable RLS on message_reads table
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for message_reads
CREATE POLICY "Users can view their own message reads" ON public.message_reads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own message reads" ON public.message_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message reads" ON public.message_reads
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  conversation_id_param uuid,
  user_id_param uuid DEFAULT auth.uid()
)
RETURNS void AS $$
BEGIN
  -- Insert read records for all unread messages in the conversation
  INSERT INTO public.message_reads (message_id, user_id, read_at)
  SELECT m.id, user_id_param, now()
  FROM public.messages m
  WHERE m.conversation_id = conversation_id_param
    AND m.sender_id != user_id_param  -- Don't mark own messages as read
    AND NOT EXISTS (
      SELECT 1 FROM public.message_reads mr 
      WHERE mr.message_id = m.id AND mr.user_id = user_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get read status for messages
CREATE OR REPLACE FUNCTION get_message_read_status(message_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  read_at timestamp with time zone,
  user_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.user_id,
    mr.read_at,
    u.full_name
  FROM public.message_reads mr
  JOIN public.users u ON u.id = mr.user_id
  WHERE mr.message_id = message_id_param
  ORDER BY mr.read_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get unread count for a conversation
CREATE OR REPLACE FUNCTION get_conversation_unread_count(
  conversation_id_param uuid,
  user_id_param uuid DEFAULT auth.uid()
)
RETURNS integer AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM public.messages m
  WHERE m.conversation_id = conversation_id_param
    AND m.sender_id != user_id_param
    AND NOT EXISTS (
      SELECT 1 FROM public.message_reads mr 
      WHERE mr.message_id = m.id AND mr.user_id = user_id_param
    );
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION mark_messages_as_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_read_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_unread_count(uuid, uuid) TO authenticated;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON public.message_reads(read_at);
CREATE INDEX IF NOT EXISTS idx_message_reads_message_user ON public.message_reads(message_id, user_id);
