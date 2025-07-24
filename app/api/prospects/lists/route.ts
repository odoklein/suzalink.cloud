// Handles POST (create list)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function POST(req: NextRequest) {
  const supabase = createClient();
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
