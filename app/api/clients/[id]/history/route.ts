import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch all history entries for a client
export async function GET(req: NextRequest, context: any) {
  const { id } = context.params;
  const { data, error } = await supabase
    .from('client_history')
    .select('*')
    .eq('client_id', id)
    .order('date', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST: Add a new history entry to a client
export async function POST(req: NextRequest, context: any) {
  const { id } = context.params;
  const body = await req.json();
  const { type, description, outcome } = body;
  const { data, error } = await supabase
    .from('client_history')
    .insert([{ type, description, outcome, client_id: id, date: new Date().toISOString().split('T')[0] }])
    .select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data[0], { status: 201 });
}

// DELETE: Remove a history entry by id
export async function DELETE(req: NextRequest, context: any) {
  const { id } = context.params;
  const { historyId } = await req.json();
  const { data, error } = await supabase
    .from('client_history')
    .delete()
    .eq('id', historyId)
    .eq('client_id', id)
    .select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
