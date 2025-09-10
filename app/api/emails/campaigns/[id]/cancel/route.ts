import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const campaignId = resolvedParams.id;
    const supabase = await createServerSupabaseClient();

    // Get current campaign status
    const { data: campaign, error: fetchError } = await supabase
      .from('email_campaigns')
      .select('status, user_id')
      .eq('id', campaignId)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if campaign can be cancelled
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json({
        error: 'Campaign cannot be cancelled. Only draft or scheduled campaigns can be cancelled.'
      }, { status: 400 });
    }

    // Update campaign status to cancelled
    const { error: updateError } = await supabase
      .from('email_campaigns')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('user_id', session.user.id);

    if (updateError) {
      console.error('Error updating campaign status:', updateError);
      return NextResponse.json({ error: 'Failed to cancel campaign' }, { status: 500 });
    }

    // Optionally, update any pending email sends to cancelled status
    const { error: sendsError } = await supabase
      .from('email_sends')
      .update({ status: 'cancelled' })
      .eq('campaign_id', campaignId)
      .in('status', ['queued', 'pending']);

    if (sendsError) {
      console.error('Error updating email sends:', sendsError);
      // Don't fail the request if this fails, as the campaign is already cancelled
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign cancelled successfully'
    });
  } catch (error: any) {
    console.error('Campaign cancel error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to cancel campaign'
    }, { status: 500 });
  }
}
