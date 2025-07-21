import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message_id, rating } = body;
  // You may want to authenticate the user here as well
  if (!message_id || !rating) {
    return NextResponse.json({ error: 'Missing message_id or rating' }, { status: 400 });
  }
  // Optionally, get user from session
  // const user = ...
  // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('ai_interaction_feedback').insert([
    {
      message_id,
      rating,
      // user_id: user.id, // Uncomment if you have user info
    },
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
