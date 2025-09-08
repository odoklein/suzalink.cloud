import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/invoices/[id]/audit - Get audit log for invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify invoice ownership
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { data: auditLog, error } = await supabase
      .from('invoice_audit_log')
      .select(`
        *,
        users!invoice_audit_log_performed_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('invoice_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit log:', error);
      return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
    }

    return NextResponse.json({ audit_log: auditLog || [] });
  } catch (error) {
    console.error('Error in audit API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
