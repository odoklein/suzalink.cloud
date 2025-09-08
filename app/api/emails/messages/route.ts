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
    const folderParam = searchParams.get('folder');
    const accountId = searchParams.get('account');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createServerSupabaseClient();

    // First, determine if folderParam is a UUID or folder name
    let folderId = null;
    if (folderParam) {
      // Check if it's a UUID (contains hyphens and is 36 chars)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(folderParam);
      
      if (isUUID) {
        folderId = folderParam;
      } else {
        // It's a folder name, find the folder ID
        const folderTypeMap: { [key: string]: string } = {
          'inbox': 'inbox',
          'sent': 'sent', 
          'drafts': 'drafts',
          'trash': 'trash',
          'spam': 'spam'
        };
        
        const folderType = folderTypeMap[folderParam.toLowerCase()] || folderParam;
        
        const { data: folder } = await supabase
          .from('email_folders')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('folder_type', folderType)
          .single();
          
        if (folder) {
          folderId = folder.id;
        }
      }
    }

    let query = supabase
      .from('personal_emails')
      .select(`
        id,
        message_id,
        subject,
        sender_name,
        sender_email,
        is_read,
        is_starred,
        has_attachments,
        sent_at,
        received_at
      `)
      .eq('user_id', session.user.id)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by folder if specified
    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    // Filter by email config if specified
    if (accountId) {
      query = query.eq('email_config_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching email messages:', error);
      return NextResponse.json({ error: 'Failed to fetch email messages' }, { status: 500 });
    }

    console.log('📧 Messages query result:', {
      folderParam,
      folderId,
      accountId,
      messageCount: data?.length || 0,
      sampleMessage: data?.[0] ? {
        id: data[0].id,
        subject: data[0].subject,
        sender_email: data[0].sender_email
      } : null
    });

    // Transform snake_case to camelCase for frontend
    const transformedData = data?.map(email => ({
      id: email.id,
      messageId: email.message_id,
      subject: email.subject,
      senderName: email.sender_name,
      senderEmail: email.sender_email,
      isRead: email.is_read,
      isStarred: email.is_starred,
      hasAttachments: email.has_attachments,
      sentAt: email.sent_at,
      receivedAt: email.received_at
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailIds, isRead, isStarred } = body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: 'emailIds array is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const updateData: any = {};
    if (isRead !== undefined) updateData.is_read = isRead;
    if (isStarred !== undefined) updateData.is_starred = isStarred;

    const { data, error } = await supabase
      .from('personal_emails')
      .update(updateData)
      .in('id', emailIds)
      .eq('user_id', session.user.id)
      .select();

    if (error) {
      console.error('Error updating email messages:', error);
      return NextResponse.json({ error: 'Failed to update email messages' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
