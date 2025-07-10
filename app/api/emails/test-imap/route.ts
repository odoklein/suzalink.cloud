import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid authorization header' },
        { status: 401 }
      );
    }

    // Extract the JWT token
    const token = authHeader.substring(7);

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get the email account credentials for this user
    const { data: emailAccounts, error: fetchError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch email account credentials' },
        { status: 500 }
      );
    }

    if (!emailAccounts || emailAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No email account found for this user' },
        { status: 404 }
      );
    }

    const emailAccount = emailAccounts[0];

    // Test IMAP connection
    const client = new ImapFlow({
      host: emailAccount.imap_host,
      port: emailAccount.imap_port,
      secure: emailAccount.imap_port === 993, // Use SSL for port 993
      auth: {
        user: emailAccount.email,
        pass: emailAccount.password
      },
      logger: false // Disable logging for security
    });

    try {
      // Connect to the IMAP server
      await client.connect();
      
      // Test authentication by listing mailboxes
      const lock = await client.getMailboxLock('INBOX');
      try {
        // Just check if we can access the mailbox
        const mailbox = await client.mailboxOpen('INBOX');
        await client.mailboxClose();
      } finally {
        lock.release();
      }

      // Disconnect
      await client.logout();

      return NextResponse.json({
        success: true,
        message: 'IMAP connection successful',
        email: emailAccount.email,
        host: emailAccount.imap_host,
        port: emailAccount.imap_port
      });

    } catch (imapError) {
      // Clean up connection if it exists
      try {
        await client.logout();
      } catch (logoutError) {
        // Ignore logout errors
      }

      // Return specific error message
      const errorMessage = imapError instanceof Error ? imapError.message : 'Unknown IMAP error';
      
      return NextResponse.json({
        success: false,
        error: 'IMAP connection failed',
        details: errorMessage,
        email: emailAccount.email,
        host: emailAccount.imap_host,
        port: emailAccount.imap_port
      }, { status: 400 });

    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 