import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      template_id,
      prospect_ids,
      scheduled_at,
    } = body;

    if (!name || !template_id || !prospect_ids || !Array.isArray(prospect_ids)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Validate template exists and belongs to user
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('id, name, subject, content')
      .eq('id', template_id)
      .eq('user_id', session.user.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 400 });
    }

    // Ensure we have valid content for the campaign
    if (!template.content) {
      return NextResponse.json({ error: 'Template has no content' }, { status: 400 });
    }

    // Validate prospects exist and get their data
    const { data: prospects, error: prospectsError } = await supabase
      .from('prospects')
      .select('id, data, list_id')
      .in('id', prospect_ids);

    if (prospectsError || !prospects || prospects.length !== prospect_ids.length) {
      return NextResponse.json({ error: 'Some prospects not found' }, { status: 400 });
    }

    // Get user's default email configuration for sender email
    const { data: emailConfig, error: configError } = await supabase
      .from('user_email_configs')
      .select('email_address, display_name')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (configError || !emailConfig) {
      return NextResponse.json({ error: 'No active email configuration found' }, { status: 400 });
    }

    // Create the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        user_id: session.user.id,
        name,
        description: description || null,
        template_id,
        subject: template.subject,
        html_content: template.content,
        text_content: template.content, // Use content for both html and text
        sender_name: emailConfig.display_name,
        sender_email: emailConfig.email_address,
        status: scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: scheduled_at || null,
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    // Add prospects to campaign recipients
    const campaignRecipients = prospects.map(prospect => ({
      campaign_id: campaign.id,
      prospect_id: prospect.id,
      prospect_list_id: prospect.list_id,
      prospect_data: prospect.data,
      recipient_email: prospect.data?.email || null, // Extract email from prospect data
      recipient_name: prospect.data?.name || null,   // Extract name from prospect data
      send_status: 'pending',
    }));

    const { error: recipientsError } = await supabase
      .from('campaign_recipients')
      .insert(campaignRecipients);

    if (recipientsError) {
      console.error('Error adding recipients to campaign:', recipientsError);
      // Clean up the campaign if recipients failed
      await supabase.from('email_campaigns').delete().eq('id', campaign.id);
      return NextResponse.json({ error: 'Failed to add recipients to campaign' }, { status: 500 });
    }

    // Log activity for each prospect
    const activities = prospects.map(prospect => ({
      prospect_id: prospect.id,
      user_id: session.user.id,
      activity_type: 'email',
      description: `Added to email campaign: ${name}`,
      metadata: {
        campaign_id: campaign.id,
        campaign_name: name,
        template_id,
        scheduled_at: scheduled_at || null,
      },
    }));

    const { error: activitiesError } = await supabase
      .from('prospect_activities')
      .insert(activities);

    if (activitiesError) {
      console.error('Error logging prospect activities:', activitiesError);
      // Don't fail the campaign creation for activity logging errors
    }

    return NextResponse.json({
      campaign,
      recipients_added: prospect_ids.length,
    });
  } catch (error: any) {
    console.error('Create campaign error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create campaign'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('email_campaigns')
      .select(`
        *,
        email_templates (
          id,
          name,
          subject
        ),
        user_email_configs (
          id,
          email_address,
          display_name
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error('Fetch campaigns error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch campaigns'
    }, { status: 500 });
  }
}
