import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { type, created_by, title, participants } = await req.json();
  if (!type || !created_by) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  // Create the conversation
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert([{ type, created_by, title }])
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Insert participants (include creator if not present)
  const allParticipants = Array.isArray(participants) ? [...participants] : [];
  if (!allParticipants.includes(created_by)) {
    allParticipants.push(created_by);
  }
  const participantRows = allParticipants.map((user_id: string) => ({ conversation_id: conversation.id, user_id }));
  const { error: partError } = await supabase.from('conversation_participants').insert(participantRows);
  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 });
  }
  return NextResponse.json({ conversation });
} 