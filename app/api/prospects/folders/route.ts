// Handles POST (create folder) and GET (list folders for user)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  try {
    const { name, user_id } = await req.json();
    if (!name || !user_id) {
      return NextResponse.json({ error: 'Missing name or user_id' }, { status: 400 });
    }
    const { data, error } = await supabase.from('folders').insert([{ name, user_id }]).select().single();
    if (error) throw error;
    return NextResponse.json({ folder: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }
    const { data, error } = await supabase.from('folders').select('*').eq('user_id', user_id);
    if (error) throw error;
    return NextResponse.json({ folders: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
