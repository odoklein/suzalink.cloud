// Handles POST (create list)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client with service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { name, folder_id, user_id, csv_url, columns } = await req.json();
    if (!name || !folder_id || !user_id || !csv_url || !columns) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { data, error } = await supabase.from('lists').insert([{ name, folder_id, user_id, csv_url, columns }]).select().single();
    if (error) throw error;
    return NextResponse.json({ list: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
