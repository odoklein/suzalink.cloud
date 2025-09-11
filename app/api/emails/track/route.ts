import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Email tracking endpoint for opens, clicks, etc.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingId = searchParams.get('tid');
    const eventType = searchParams.get('e'); // 'open', 'click'
    const url = searchParams.get('url'); // For click tracking

    if (!trackingId || !eventType) {
      return new Response('Invalid tracking request', { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Find the email send record by tracking ID
    const { data: emailSend, error: sendError } = await supabase
      .from('email_sends')
      .select('*')
      .eq('tracking_id', trackingId)
      .single();

    if (sendError || !emailSend) {
      console.log('Tracking ID not found:', trackingId);
      return new Response('Tracking pixel', { status: 200 });
    }

    // Record the tracking event
    const eventData: any = {
      event_type: eventType,
      send_id: emailSend.id,
      user_agent: request.headers.get('user-agent'),
      ip_address: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown'
    };

    if (eventType === 'click' && url) {
      eventData.clicked_url = decodeURIComponent(url);
    }

    const { error: eventError } = await supabase
      .from('email_tracking_events')
      .insert(eventData);

    if (eventError) {
      console.error('Error recording tracking event:', eventError);
    }

    // Update email send status based on event
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (eventType === 'open') {
      updateData.status = 'opened';
    } else if (eventType === 'click') {
      updateData.status = 'clicked';
    }

    await supabase
      .from('email_sends')
      .update(updateData)
      .eq('id', emailSend.id);

    // Update campaign analytics
    if (emailSend.campaign_id) {
      await updateCampaignAnalytics(emailSend.campaign_id, supabase);
    }

    // Handle different response types
    if (eventType === 'open') {
      // Return a 1x1 transparent pixel
      const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      return new Response(pixel, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else if (eventType === 'click') {
      // Redirect to the original URL
      const redirectUrl = url || 'https://example.com';
      return NextResponse.redirect(redirectUrl);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Email tracking error:', error);
    return new Response('Tracking error', { status: 500 });
  }
}

// Function to update campaign analytics
async function updateCampaignAnalytics(campaignId: string, supabase: any) {
  try {
    // Get current analytics
    const { data: sends, error } = await supabase
      .from('email_sends')
      .select('status')
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Error fetching sends for analytics:', error);
      return;
    }

    // Calculate stats
    const stats = {
      sent_count: sends.filter(s => s.status === 'sent').length,
      delivered_count: sends.filter(s => s.status === 'delivered').length,
      opened_count: sends.filter(s => s.status === 'opened').length,
      clicked_count: sends.filter(s => s.status === 'clicked').length,
      bounced_count: sends.filter(s => s.status === 'bounced').length,
      total_recipients: sends.length
    };

    // Update campaign stats
    await supabase
      .from('email_campaigns')
      .update(stats)
      .eq('id', campaignId);

    // Insert daily analytics
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('campaign_analytics')
      .upsert({
        campaign_id: campaignId,
        date: today,
        ...stats
      }, {
        onConflict: 'campaign_id,date'
      });

  } catch (error) {
    console.error('Error updating campaign analytics:', error);
  }
}

// Handle bounce notifications (webhook)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackingId, eventType, error } = body;

    if (!trackingId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Find the email send record
    const { data: emailSend, error: sendError } = await supabase
      .from('email_sends')
      .select('*')
      .eq('tracking_id', trackingId)
      .single();

    if (sendError || !emailSend) {
      return NextResponse.json({ error: 'Tracking ID not found' }, { status: 404 });
    }

    // Record bounce event
    const { error: eventError } = await supabase
      .from('email_tracking_events')
      .insert({
        event_type: eventType,
        send_id: emailSend.id,
        event_data: { error },
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
      });

    if (eventError) {
      console.error('Error recording bounce event:', eventError);
    }

    // Update email send status
    await supabase
      .from('email_sends')
      .update({
        status: eventType === 'bounce' ? 'bounced' : 'failed',
        error_message: error,
        updated_at: new Date().toISOString()
      })
      .eq('id', emailSend.id);

    // Update campaign analytics
    if (emailSend.campaign_id) {
      await updateCampaignAnalytics(emailSend.campaign_id, supabase);
    }

    return NextResponse.json({ message: 'Bounce recorded successfully' });

  } catch (error) {
    console.error('Bounce tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
