import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { chat_id, sender_id, content, file_url } = await req.json();
  if (!chat_id || !sender_id || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  // Check if sender is a participant
  const { data: participant, error: partError } = await supabase
    .from('chat_participants')
    .select('*')
    .eq('chat_id', chat_id)
    .eq('user_id', sender_id)
    .single();
  if (partError || !participant) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ chat_id, sender_id, content, file_url }])
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: data });
} 