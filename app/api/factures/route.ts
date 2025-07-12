import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { logUserActivity } from "@/lib/supabase-examples";

// GET: List all factures, or filter by client_id
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const client_id = searchParams.get('client_id');
  let query = supabase.from('factures').select('*');
  if (client_id) {
    query = query.eq('client_id', client_id);
  }
  const { data, error } = await query.order('date', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST: Create a new facture
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { client_id, services, date, subtotal, total, invoice_number, user_id } = body;
  const { data, error } = await supabase.from('factures').insert([
    { client_id, services, date, subtotal, total, invoice_number }
  ]).select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No facture was created.' }, { status: 500 });
  }
  // Log user activity if user_id is provided
  if (user_id) {
    await logUserActivity(user_id, 'create_facture', { facture_id: data[0].id, client_id });
  }
  return NextResponse.json(data[0], { status: 201 });
} 