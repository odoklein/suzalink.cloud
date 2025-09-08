import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/invoices/stats - Get invoice statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get status counts
    const { data: statusCounts, error: statusError } = await supabase
      .from('invoices')
      .select('status')
      .eq('user_id', session.user.id);

    if (statusError) {
      console.error('Error fetching invoice stats:', statusError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Calculate stats
    const stats = {
      total: statusCounts?.length || 0,
      draft: statusCounts?.filter(invoice => invoice.status === 'draft').length || 0,
      sent: statusCounts?.filter(invoice => invoice.status === 'sent').length || 0,
      viewed: statusCounts?.filter(invoice => invoice.status === 'viewed').length || 0,
      paid: statusCounts?.filter(invoice => invoice.status === 'paid').length || 0,
      overdue: statusCounts?.filter(invoice => invoice.status === 'overdue').length || 0,
      cancelled: statusCounts?.filter(invoice => invoice.status === 'cancelled').length || 0,
    };

    // Get total amounts by status
    const { data: amountData, error: amountError } = await supabase
      .from('invoices')
      .select('status, total_amount, currency')
      .eq('user_id', session.user.id);

    if (amountError) {
      console.error('Error fetching amount stats:', amountError);
    }

    // Calculate monetary totals (assuming all in same currency for now)
    const monetaryStats = {
      total_amount: amountData?.reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0,
      draft_amount: amountData?.filter(invoice => invoice.status === 'draft').reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0,
      sent_amount: amountData?.filter(invoice => invoice.status === 'sent').reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0,
      paid_amount: amountData?.filter(invoice => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0,
      overdue_amount: amountData?.filter(invoice => invoice.status === 'overdue').reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0,
    };

    return NextResponse.json({
      stats: {
        ...stats,
        ...monetaryStats,
        currency: 'USD' // TODO: Get from user settings
      }
    });
  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
