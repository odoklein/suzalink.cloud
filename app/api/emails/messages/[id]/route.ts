import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailId = (await params).id;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('personal_emails')
      .select(`
        id,
        message_id,
        subject,
        sender_name,
        sender_email,
        recipient_emails,
        cc_emails,
        bcc_emails,
        email_text,
        email_html,
        sent_at,
        received_at,
        is_read,
        is_starred,
        has_attachments
      `)
      .eq('id', emailId)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching email:', error);
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Mark as read if not already read
    if (!data.is_read) {
      await supabase
        .from('personal_emails')
        .update({ is_read: true })
        .eq('id', emailId)
        .eq('user_id', session.user.id);
    }

    // Transform snake_case to camelCase for frontend
    const transformedData = {
      id: data.id,
      messageId: data.message_id,
      subject: data.subject,
      senderName: data.sender_name,
      senderEmail: data.sender_email,
      recipientEmails: data.recipient_emails || [],
      ccEmails: data.cc_emails || [],
      bccEmails: data.bcc_emails || [],
      emailText: data.email_text,
      emailHtml: data.email_html,
      sentAt: data.sent_at,
      receivedAt: data.received_at,
      isRead: true, // We just marked it as read
      isStarred: data.is_starred,
      hasAttachments: data.has_attachments
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailId = (await params).id;
    const body = await request.json();
    const { isRead, isStarred } = body;

    const supabase = await createServerSupabaseClient();

    const updateData: any = {};
    if (isRead !== undefined) updateData.is_read = isRead;
    if (isStarred !== undefined) updateData.is_starred = isStarred;

    const { data, error } = await supabase
      .from('personal_emails')
      .update(updateData)
      .eq('id', emailId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating email:', error);
      return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
    }

    // Transform snake_case to camelCase for frontend
    const transformedData = {
      id: data.id,
      messageId: data.message_id,
      subject: data.subject,
      senderName: data.sender_name,
      senderEmail: data.sender_email,
      recipientEmails: data.recipient_emails || [],
      ccEmails: data.cc_emails || [],
      bccEmails: data.bcc_emails || [],
      emailText: data.email_text,
      emailHtml: data.email_html,
      sentAt: data.sent_at,
      receivedAt: data.received_at,
      isRead: data.is_read,
      isStarred: data.is_starred,
      hasAttachments: data.has_attachments
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
