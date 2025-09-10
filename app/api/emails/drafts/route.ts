import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get drafts folder
    const { data: draftsFolder } = await supabase
      .from('email_folders')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('folder_type', 'drafts')
      .single();

    if (!draftsFolder) {
      return NextResponse.json([]);
    }

    // Get draft emails
    const { data, error } = await supabase
      .from('personal_emails')
      .select(`
        id,
        subject,
        recipient_emails,
        email_text,
        email_html,
        created_at,
        updated_at
      `)
      .eq('user_id', session.user.id)
      .eq('folder_id', draftsFolder.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching drafts:', error);
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      to,
      cc,
      bcc,
      subject,
      content,
      attachments,
      configId,
    } = body;

    const supabase = await createClient();

    // Get drafts folder
    const { data: draftsFolder } = await supabase
      .from('email_folders')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('folder_type', 'drafts')
      .single();

    if (!draftsFolder) {
      return NextResponse.json({ error: 'Drafts folder not found' }, { status: 400 });
    }

    // Get user's default email config
    let configQuery = supabase
      .from('user_email_configs')
      .select('id, email_address, display_name')
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    if (configId) {
      configQuery = configQuery.eq('id', configId);
    } else {
      configQuery = configQuery.limit(1);
    }

    const { data: config } = await configQuery.single();

    if (!config) {
      return NextResponse.json({ error: 'No active email configuration found' }, { status: 400 });
    }

    // Save draft
    const { data, error } = await supabase
      .from('personal_emails')
      .insert({
        user_id: session.user.id,
        email_config_id: config.id,
        folder_id: draftsFolder.id,
        subject: subject || '(No Subject)',
        sender_name: config.display_name,
        sender_email: config.email_address,
        recipient_emails: to ? (Array.isArray(to) ? to : [to]) : [],
        cc_emails: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
        bcc_emails: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
        email_text: content?.replace(/<[^>]*>/g, '') || '',
        email_html: content || '',
        sent_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
        is_read: true,
        has_attachments: attachments && attachments.length > 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving draft:', error);
      return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
    }

    // Handle attachments for drafts
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.file) {
          // Upload file to storage
          const fileName = `${Date.now()}-${attachment.file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('email-attachments')
            .upload(fileName, attachment.file);

          if (uploadError) {
            console.error('Error uploading attachment:', uploadError);
            continue;
          }

          // Save attachment record
          await supabase
            .from('email_attachments')
            .insert({
              email_id: data.id,
              filename: attachment.file.name,
              content_type: attachment.file.type,
              size_bytes: attachment.file.size,
              storage_path: fileName,
            });
        }
      }
    }

    return NextResponse.json({
      message: 'Draft saved successfully',
      draft: data,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

