import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest, context: any) {
  const conversationId = context.params.id;
  const userId = req.headers.get('x-user-id');
  if (!conversationId) {
    return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 401 });
  }
  // Check if user is a participant
  const { data: participant, error: partError } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();
  if (partError || !participant) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }
  // Get messages
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Get participants with user info
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('user_id, users(full_name, email)')
    .eq('conversation_id', conversationId);
  return NextResponse.json({ messages, participants });
} 