import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const folderName = searchParams.get('folder') || 'INBOX';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const debug = searchParams.get('debug') === 'true';

    console.log('📥 API Request - userId:', userId, 'folder:', folderName, 'limit:', limit);

    if (!userId) {
      console.log('❌ Missing userId');
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Debug: Check all emails for this user
    if (debug) {
      const { data: allEmails, error: debugError } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId);
      
      console.log('🔍 DEBUG - All emails for user:', { 
        count: allEmails?.length || 0, 
        emails: allEmails,
        error: debugError?.message 
      });
      
      return NextResponse.json({
        debug: true,
        totalEmails: allEmails?.length || 0,
        emails: allEmails || []
      });
    }

    // Get or create folder
    const folder = await getOrCreateFolder(userId, folderName);
    if (!folder) {
      console.log('❌ Could not get folder');
      return NextResponse.json({ error: 'Could not get folder' }, { status: 500 });
    }

    console.log('📁 Folder found/created:', folder);

    // Build query
    let query = supabase
      .from('emails')
      .select(`
        *,
        email_folders!inner(name, display_name),
        email_attachments(*)
      `)
      .eq('user_id', userId)
      .eq('folder_id', folder.id)
      .eq('is_deleted', false)
      .order('date_received', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add search filter if provided
    if (search.trim()) {
      query = query.or(`subject.ilike.%${search}%,from_address.ilike.%${search}%,text_content.ilike.%${search}%`);
    }

    console.log('🔍 Executing database query for user:', userId, 'folder_id:', folder.id);

    const { data: emails, error, count } = await query;

    console.log('📊 Database query result:', { 
      emailsCount: emails?.length || 0, 
      error: error?.message, 
      count 
    });

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to match frontend expectations
    const transformedEmails = emails?.map((email: any) => ({
      id: email.id,
      from: email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address,
      subject: email.subject || '(Sans objet)',
      date: email.date_received,
      text: email.text_content || '',
      html: email.html_content || '',
      labels: [email.email_folders.display_name],
      attachments: email.email_attachments?.map((att: any) => ({
        id: att.id,
        filename: att.filename,
        contentType: att.content_type,
        size: att.size_bytes
      })) || [],
      read: email.is_read,
      starred: email.is_starred,
      messageId: email.message_id,
      imapUid: email.imap_uid,
      folderId: email.folder_id
    })) || [];

    console.log('✅ Transformed emails:', transformedEmails.length);

    return NextResponse.json({
      emails: transformedEmails,
      count: count || 0,
      folder: {
        id: folder.id,
        name: folder.name,
        displayName: folder.display_name
      }
    });

  } catch (error) {
    console.error('❌ Email load error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getOrCreateFolder(userId: string, folderName: string) {
  const folderMap: Record<string, { displayName: string; imapPath: string }> = {
    'INBOX': { displayName: 'Boîte de réception', imapPath: 'INBOX' },
    'Sent': { displayName: 'Envoyés', imapPath: 'INBOX.Sent' },
    'Drafts': { displayName: 'Brouillons', imapPath: 'INBOX.Drafts' },
    'Trash': { displayName: 'Corbeille', imapPath: 'INBOX.Trash' }
  };

  const folderInfo = folderMap[folderName] || folderMap['INBOX'];
  console.log('📂 Looking for folder:', folderName, 'with info:', folderInfo);

  // Try to get existing folder
  let { data: folder, error } = await supabase
    .from('email_folders')
    .select('*')
    .eq('user_id', userId)
    .eq('name', folderName)
    .single();

  console.log('🔍 Folder lookup result:', { folder, error: error?.message });

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('❌ Error getting folder:', error);
    return null;
  }

  // Create folder if it doesn't exist
  if (!folder) {
    console.log('➕ Creating new folder for user:', userId, 'name:', folderName);
    const { data: newFolder, error: createError } = await supabase
      .from('email_folders')
      .insert({
        user_id: userId,
        name: folderName,
        display_name: folderInfo.displayName,
        imap_path: folderInfo.imapPath
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating folder:', createError);
      return null;
    }

    console.log('✅ Created new folder:', newFolder);
    folder = newFolder;
  }

  return folder;
} 