import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch all contacts for a client
export async function GET(req: NextRequest, context: any) {
  const { id } = context.params;
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', id)
    .order('name');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST: Add a new contact to a client
export async function POST(req: NextRequest, context: any) {
  const { id } = context.params;
  const body = await req.json();
  const { name, email, phone, status, title } = body;
  const { data, error } = await supabase
    .from('contacts')
    .insert([{ name, email, phone, status, title, client_id: id }])
    .select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data[0], { status: 201 });
}

// DELETE: Remove a contact by id
export async function DELETE(req: NextRequest, context: any) {
  const { id } = context.params;
  const { contactId } = await req.json();
  const { data, error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .eq('client_id', id)
    .select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
