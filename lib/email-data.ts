import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import { cache } from 'react';

// Cache email configurations for 5 minutes
export const getEmailConfigs = cache(async () => {
  try {
    const session = await auth();
    console.log('🔍 getEmailConfigs - Session:', session?.user?.id ? 'Found' : 'Not found');
    
    if (!session?.user?.id) {
      console.log('❌ No session found, returning empty array');
      return [];
    }

    const supabase = await createServerSupabaseClient();
    console.log('🔍 Querying user_email_configs for user:', session.user.id);
    
    const { data, error } = await supabase
      .from('user_email_configs')
      .select(`
        id,
        email_address,
        display_name,
        is_active,
        last_sync_at,
        sync_frequency_minutes,
        created_at
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching email configs:', error);
      return [];
    }

    console.log('✅ Found email configs:', data?.length || 0);
    return data?.map(config => ({
      id: config.id,
      emailAddress: config.email_address,
      displayName: config.display_name,
      isActive: config.is_active,
      lastSyncAt: config.last_sync_at,
      syncFrequencyMinutes: config.sync_frequency_minutes,
      createdAt: config.created_at
    })) || [];
  } catch (error) {
    console.error('❌ Error in getEmailConfigs:', error);
    return [];
  }
});

// Cache email folders for 5 minutes
export const getEmailFolders = cache(async () => {
  try {
    const session = await auth();
    console.log('🔍 getEmailFolders - Session:', session?.user?.id ? 'Found' : 'Not found');
    
    if (!session?.user?.id) {
      console.log('❌ No session found, returning empty array');
      return [];
    }

    const supabase = await createServerSupabaseClient();
    console.log('🔍 Querying email_folders for user:', session.user.id);
    
    const { data, error } = await supabase
      .from('email_folders')
      .select(`
        id,
        folder_name,
        folder_path,
        folder_type,
        message_count,
        unread_count,
        email_config_id
      `)
      .eq('user_id', session.user.id)
      .order('folder_type', { ascending: false })
      .order('folder_name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching email folders:', error);
      return [];
    }

    console.log('✅ Found email folders:', data?.length || 0);
    return data?.map(folder => ({
      id: folder.id,
      folderName: folder.folder_name,
      folderPath: folder.folder_path,
      folderType: folder.folder_type,
      messageCount: folder.message_count,
      unreadCount: folder.unread_count,
      emailConfigId: folder.email_config_id
    })) || [];
  } catch (error) {
    console.error('❌ Error in getEmailFolders:', error);
    return [];
  }
});

// Cache email messages for 2 minutes
export const getEmailMessages = cache(async (folderId?: string, accountId?: string, limit = 50) => {
  try {
    const session = await auth();
    console.log('🔍 getEmailMessages - Session:', session?.user?.id ? 'Found' : 'Not found');
    console.log('🔍 getEmailMessages - Params:', { folderId, accountId, limit });
    
    if (!session?.user?.id) {
      console.log('❌ No session found, returning empty array');
      return [];
    }

    const supabase = await createServerSupabaseClient();
    
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
      .limit(limit);

    if (folderId) {
      console.log('🔍 Filtering by folderId:', folderId);
      query = query.eq('folder_id', folderId);
    }

    if (accountId) {
      console.log('🔍 Filtering by accountId:', accountId);
      query = query.eq('email_config_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching email messages:', error);
      return [];
    }

    console.log('✅ Found email messages:', data?.length || 0);
    return data?.map(email => ({
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
    })) || [];
  } catch (error) {
    console.error('❌ Error in getEmailMessages:', error);
    return [];
  }
});

// Cache individual email for 1 minute
export const getEmailById = cache(async (emailId: string) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

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
      return null;
    }

    return {
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
  } catch (error) {
    console.error('Error in getEmailById:', error);
    return null;
  }
});
