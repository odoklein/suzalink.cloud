import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { type, created_by, project_id, participants } = await req.json();
  if (!type || !created_by) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  // Create the chat
  const { data: chat, error } = await supabase
    .from('chats')
    .insert([{ type, created_by, project_id }])
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Insert participants (include creator if not present)
  let allParticipants = Array.isArray(participants) ? participants : [];
  if (!allParticipants.includes(created_by)) {
    allParticipants.push(created_by);
  }
  const participantRows = allParticipants.map((user_id: string) => ({ chat_id: chat.id, user_id }));
  const { error: partError } = await supabase.from('chat_participants').insert(participantRows);
  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 });
  }
  return NextResponse.json({ chat });
} 