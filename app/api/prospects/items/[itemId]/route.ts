import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

// PATCH /api/prospects/items/[itemId]
export async function PATCH(req: NextRequest, { params }: any) {
  const supabase = createClient();
  const { itemId } = params;
  try {
    const { user_id, list_id, action_type, old_data, new_data } = await req.json();
    // Fetch current prospect (for old_data if not provided)
    let prevData = old_data;
    if (!prevData) {
      const { data: existing, error: fetchError } = await supabase.from('list_items').select('data').eq('id', itemId).single();
      if (fetchError) throw fetchError;
      prevData = existing?.data;
    }
    // Log the action
    const { error: logError } = await supabase.from('prospect_action_logs').insert([
      {
        user_id,
        list_id,
        prospect_id: itemId,
        action_type: action_type || 'edit',
        old_data: prevData,
        new_data,
      }
    ]);
    if (logError) throw logError;
    // Update the prospect record
    const { error: updateError, data: updated } = await supabase.from('list_items').update({ data: new_data }).eq('id', itemId).select().single();
    if (updateError) throw updateError;
    return NextResponse.json({ success: true, updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
