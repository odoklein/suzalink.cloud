import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function GET(
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

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_templates (
          id,
          name,
          subject
        )
      `)
      .eq('id', campaignId)
      .eq('user_id', session.user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('Campaign fetch error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch campaign'
    }, { status: 500 });
  }
}
