import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import CryptoJS from 'crypto-js';

// Get all email configurations for the current user
export async function GET() {
  try {
    console.log('📧 GET /api/emails/config - Starting...');
    const session = await auth();
    console.log('📧 Session check:', !!session?.user?.id);
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📧 Creating Supabase client...');
    const supabase = await createServerSupabaseClient();

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
      return NextResponse.json({ error: 'Failed to fetch email configurations', details: error.message }, { status: 500 });
    }

    console.log('✅ Successfully fetched', data?.length || 0, 'email configs');
    
    // Transform snake_case to camelCase for frontend
    const transformedData = data?.map(config => ({
      id: config.id,
      emailAddress: config.email_address,
      displayName: config.display_name,
      isActive: config.is_active,
      lastSyncAt: config.last_sync_at,
      syncFrequencyMinutes: config.sync_frequency_minutes,
      createdAt: config.created_at
    }));
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new email configuration
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      emailAddress,
      displayName,
      imapHost,
      imapPort,
      imapSecure,
      imapUsername,
      imapPassword,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUsername,
      smtpPassword,
    } = body;

    // Validate required fields
    if (!emailAddress || !displayName || !imapHost || !imapUsername || !imapPassword ||
        !smtpHost || !smtpUsername || !smtpPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if email address already exists for this user
    const { data: existing } = await supabase
      .from('user_email_configs')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('email_address', emailAddress)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Email address already configured' }, { status: 409 });
    }

    // Encrypt passwords using environment variable (recommended) or fallback key
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.warn('⚠️  ENCRYPTION_KEY environment variable not set. Using fallback key for development.');
      console.warn('⚠️  Set ENCRYPTION_KEY in your environment variables for production security.');
    }
    const finalEncryptionKey = encryptionKey || '123123123';
    const encryptedImapPassword = CryptoJS.AES.encrypt(imapPassword, finalEncryptionKey).toString();
    const encryptedSmtpPassword = CryptoJS.AES.encrypt(smtpPassword, finalEncryptionKey).toString();

    // Create the email configuration
    const { data, error } = await supabase
      .from('user_email_configs')
      .insert({
        user_id: session.user.id,
        email_address: emailAddress,
        display_name: displayName,
        imap_host: imapHost,
        imap_port: imapPort || 993,
        imap_secure: imapSecure ?? true,
        imap_username: imapUsername,
        imap_password_encrypted: encryptedImapPassword,
        smtp_host: smtpHost,
        smtp_port: smtpPort || 587,
        smtp_secure: smtpSecure ?? false,
        smtp_username: smtpUsername,
        smtp_password_encrypted: encryptedSmtpPassword,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating email config:', error);
      return NextResponse.json({ error: 'Failed to create email configuration' }, { status: 500 });
    }

    // Create default email folders
    const defaultFolders = [
      { name: 'INBOX', type: 'inbox', system: true },
      { name: 'Sent', type: 'sent', system: true },
      { name: 'Drafts', type: 'drafts', system: true },
      { name: 'Trash', type: 'trash', system: true },
      { name: 'Spam', type: 'spam', system: true },
    ];

    const folderInserts = defaultFolders.map(folder => ({
      user_id: session.user.id,
      email_config_id: data.id,
      folder_name: folder.name,
      folder_path: folder.name,
      folder_type: folder.type,
      is_system: folder.system,
    }));

    const { error: folderError } = await supabase
      .from('email_folders')
      .insert(folderInserts);

    if (folderError) {
      console.error('Error creating default folders:', folderError);
      // Don't fail the whole operation for folder creation errors
    }

    return NextResponse.json({
      message: 'Email configuration created successfully',
      data: {
        id: data.id,
        emailAddress: data.email_address,
        displayName: data.display_name,
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
