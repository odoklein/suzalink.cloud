import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { logUserActivity } from "@/lib/supabase-examples";

// GET: Get a single client by id
export async function GET(req: NextRequest, context: any) {
  const { id } = context.params;
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}

// PUT: Update a client by id
export async function PUT(req: NextRequest, context: any) {
  const { id } = context.params;
  const body = await req.json();
  const { name, contact_email, company, status, region, user_id } = body;
  const updateFields: any = { };
  if (name !== undefined) updateFields.name = name;
  if (contact_email !== undefined) updateFields.contact_email = contact_email;
  if (company !== undefined) updateFields.company = company;
  if (status !== undefined) updateFields.status = status;
  if (region !== undefined) updateFields.region = region;
  const { data, error } = await supabase.from('clients').update(updateFields).eq('id', id).select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No client was updated.' }, { status: 404 });
  }
  // Log user activity if user_id is provided
  if (user_id) {
    await logUserActivity(user_id, 'update_client', { client_id: id, updateFields });
  }
  return NextResponse.json(data[0]);
}

// DELETE: Delete a client by id
export async function DELETE(req: NextRequest, context: any) {
  const { id } = context.params;
  const body = await req.json().catch(() => ({}));
  const { user_id } = body;
  const { data, error } = await supabase.from('clients').delete().eq('id', id).select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No client was deleted.' }, { status: 404 });
  }
  // Log user activity if user_id is provided
  if (user_id) {
    await logUserActivity(user_id, 'delete_client', { client_id: id });
  }
  return NextResponse.json(data[0]);
} 