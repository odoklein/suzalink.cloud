import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const period = searchParams.get('period') || '30'; // days

    const supabase = await createServerSupabaseClient();

    if (campaignId) {
      // Get detailed stats for a specific campaign
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

      // Get recipient stats with prospect details
      const { data: recipients, error: recipientsError } = await supabase
        .from('campaign_recipients')
        .select(`
          id,
          prospect_id,
          recipient_email,
          recipient_name,
          send_status,
          sent_at,
          delivered_at,
          prospect_data,
          prospects (
            data,
            phone_number,
            status
          )
        `)
        .eq('campaign_id', campaignId);

      if (recipientsError) {
        console.error('Error fetching recipients:', recipientsError);
        return NextResponse.json({ error: 'Failed to fetch recipient stats' }, { status: 500 });
      }

      // Calculate recipient statistics
      const recipientStats = recipients.reduce((acc, recipient) => {
        acc[recipient.send_status] = (acc[recipient.send_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get email sends for this campaign
      const { data: emailSends, error: sendsError } = await supabase
        .from('email_sends')
        .select('status, sent_at, delivered_at')
        .eq('campaign_id', campaignId);

      if (sendsError) {
        console.error('Error fetching email sends:', sendsError);
      }

      // Get tracking events with send information
      const { data: trackingEvents, error: trackingError } = await supabase
        .from('email_tracking_events')
        .select('event_type, occurred_at, send_id')
        .in('send_id', emailSends?.map(send => send.id) || []);

      if (trackingError) {
        console.error('Error fetching tracking events:', trackingError);
      }

      // Calculate tracking statistics and add tracking timestamps to recipients
      const trackingStats = trackingEvents?.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Add tracking timestamps to recipients
      const recipientsWithTracking = recipients.map(recipient => {
        const recipientEmailSends = emailSends?.filter(send => send.recipient_id === recipient.id) || [];
        const recipientTrackingEvents = trackingEvents?.filter(event =>
          recipientEmailSends.some(send => send.id === event.send_id)
        ) || [];

        const openedEvent = recipientTrackingEvents.find(event => event.event_type === 'open');
        const clickedEvent = recipientTrackingEvents.find(event => event.event_type === 'click');

        // Extract company and position from the JSON data field
        const prospectData = recipient.prospects?.data || {};
        const company = prospectData.company || prospectData.entreprise || '';
        const position = prospectData.position || prospectData.poste || '';

        return {
          ...recipient,
          opened_at: openedEvent?.occurred_at,
          clicked_at: clickedEvent?.occurred_at,
          bounced_at: recipientEmailSends.find(send => send.status === 'bounced')?.bounced_at,
          prospect_data: {
            company,
            position,
            phone: recipient.prospects?.phone_number || prospectData.phone
          }
        };
      });

      // Calculate rates
      const totalRecipients = recipients.length;
      const sentCount = emailSends?.filter(send => send.status === 'sent').length || 0;
      const deliveredCount = emailSends?.filter(send => send.status === 'delivered').length || 0;
      const openedCount = trackingStats.open || 0;
      const clickedCount = trackingStats.click || 0;
      const bouncedCount = emailSends?.filter(send => send.status === 'bounced').length || 0;

      const stats = {
        campaign,
        totalRecipients,
        sentCount,
        deliveredCount,
        openedCount,
        clickedCount,
        bouncedCount,
        deliveryRate: totalRecipients > 0 ? (deliveredCount / totalRecipients * 100).toFixed(2) : 0,
        openRate: deliveredCount > 0 ? (openedCount / deliveredCount * 100).toFixed(2) : 0,
        clickRate: deliveredCount > 0 ? (clickedCount / deliveredCount * 100).toFixed(2) : 0,
        bounceRate: totalRecipients > 0 ? (bouncedCount / totalRecipients * 100).toFixed(2) : 0,
        recipientStats,
        trackingStats,
        emailSends: emailSends?.length || 0,
        prospects: recipientsWithTracking
      };

      return NextResponse.json({ stats });
    } else {
      // Get overall campaign statistics for the user
      const { data: campaigns, error: campaignsError } = await supabase
        .from('email_campaigns')
        .select(`
          id,
          name,
          status,
          created_at,
          sent_at,
          total_recipients,
          sent_count,
          delivered_count,
          opened_count,
          clicked_count,
          bounced_count
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
        return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
      }

      // Calculate overall statistics
      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length;
      const sentCampaigns = campaigns.filter(c => c.status === 'sent').length;
      const draftCampaigns = campaigns.filter(c => c.status === 'draft').length;

      const totalRecipients = campaigns.reduce((sum, c) => sum + (c.total_recipients || 0), 0);
      const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
      const totalDelivered = campaigns.reduce((sum, c) => sum + (c.delivered_count || 0), 0);
      const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0);
      const totalClicked = campaigns.reduce((sum, c) => sum + (c.clicked_count || 0), 0);
      const totalBounced = campaigns.reduce((sum, c) => sum + (c.bounced_count || 0), 0);

      const overallStats = {
        totalCampaigns,
        activeCampaigns,
        sentCampaigns,
        draftCampaigns,
        totalRecipients,
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        overallDeliveryRate: totalRecipients > 0 ? (totalDelivered / totalRecipients * 100).toFixed(2) : 0,
        overallOpenRate: totalDelivered > 0 ? (totalOpened / totalDelivered * 100).toFixed(2) : 0,
        overallClickRate: totalDelivered > 0 ? (totalClicked / totalDelivered * 100).toFixed(2) : 0,
        overallBounceRate: totalRecipients > 0 ? (totalBounced / totalRecipients * 100).toFixed(2) : 0
      };

      return NextResponse.json({ 
        overallStats,
        campaigns: campaigns.slice(0, 10) // Return recent campaigns
      });
    }
  } catch (error: any) {
    console.error('Campaign stats error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch campaign statistics'
    }, { status: 500 });
  }
}

