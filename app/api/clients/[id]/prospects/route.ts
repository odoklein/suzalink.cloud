import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET: List all client prospects for a client
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const { data, error } = await supabase
      .from('client_prospects')
      .select('*')
      .eq('client_id', id);
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch client prospects' }, { status: 500 });
  }
}

// POST: Add new client prospects (single or bulk)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const body = await req.json();
    let prospects = [];
    if (Array.isArray(body)) {
      prospects = body.map((p) => ({ ...p, client_id: id }));
    } else if (body.contacts) {
      prospects = body.contacts.map((p: any) => ({ ...p, client_id: id }));
    } else {
      prospects = [{ ...body, client_id: id }];
    }
    const { data, error } = await supabase.from('client_prospects').insert(prospects).select();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add client prospects' }, { status: 500 });
  }
}

// PUT: Bulk update (e.g., status)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const body = await req.json();
    const { ids, status } = body;
    if (!Array.isArray(ids) || !status) {
      return NextResponse.json({ error: 'Missing ids or status' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('client_prospects')
      .update({ status })
      .in('id', ids)
      .eq('client_id', id)
      .select();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update client prospects' }, { status: 500 });
  }
}

// DELETE: Bulk delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const body = await req.json();
    const { ids } = body;
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    }
    const { error } = await supabase
      .from('client_prospects')
      .delete()
      .in('id', ids)
      .eq('client_id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete client prospects' }, { status: 500 });
  }
} 