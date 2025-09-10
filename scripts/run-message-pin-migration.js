// Simple script to run the message pin migration
// This can be run manually in the Supabase SQL editor

const migrationSQL = `
-- Add is_pinned field to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Add index for pinned messages queries
CREATE INDEX IF NOT EXISTS idx_messages_is_pinned ON public.messages(is_pinned) WHERE is_pinned = TRUE;

-- Add index for conversation pinned messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_pinned ON public.messages(conversation_id, is_pinned) WHERE is_pinned = TRUE;
`;

console.log('Migration SQL to run in Supabase SQL Editor:');
console.log('==========================================');
console.log(migrationSQL);
console.log('==========================================');
console.log('Copy the above SQL and run it in your Supabase SQL Editor');
