import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// GET: List all clients
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');
  const status = searchParams.get('status');
  const region = searchParams.get('region');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

  let query = supabase.from('clients').select('*', { count: 'exact' });
  if (name) query = query.ilike('name', `%${name}%`);
  if (status) query = query.eq('status', status);
  if (region) query = query.ilike('region', `%${region}%`);
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data, count });
}

// POST: Create a new client
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, contact_email, company, status = 'active', region = '' } = body;
  const { data, error } = await supabase.from('clients').insert([{ name, contact_email, company, status, region }]).select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No client was created.' }, { status: 500 });
  }
  return NextResponse.json(data[0], { status: 201 });
} 