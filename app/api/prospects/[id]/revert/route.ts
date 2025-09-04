import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

// POST /api/prospects/[id]/revert
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { id } = await params;
  try {
    const { actionId, user_id } = await req.json();
    // Fetch the log entry
    const { data: log, error: logError } = await supabase
      .from('prospect_action_logs')
      .select('*')
      .eq('id', actionId)
      .single();
    if (logError || !log) throw logError || new Error('Log not found');
    // Revert the prospect to old_data
    const { error: updateError, data: updated } = await supabase
      .from('list_items')
      .update({ data: log.old_data })
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;
    // Optionally, add a new log entry for the revert
    const { error: revertLogError } = await supabase.from('prospect_action_logs').insert([
      {
        user_id: user_id || log.user_id,
        list_id: log.list_id,
        prospect_id: id,
        action_type: 'revert',
        old_data: log.new_data, // what we just overwrote
        new_data: log.old_data, // what we reverted to
      }
    ]);
    if (revertLogError) throw revertLogError;
    return NextResponse.json({ success: true, reverted: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
