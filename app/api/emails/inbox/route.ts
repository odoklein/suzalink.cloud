import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EmailMessage {
  uid: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  flags: string[];
}

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables:', {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

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

    // Connect to IMAP
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
      
      // Open the INBOX
      const lock = await client.getMailboxLock('INBOX');
      try {
        const mailbox = await client.mailboxOpen('INBOX');
        
        // Get the total number of messages
        const totalMessages = mailbox.exists;
        
        if (totalMessages === 0) {
          return NextResponse.json({
            emails: [],
            total: 0,
            message: 'No emails found in inbox'
          });
        }

        // Calculate the range for the 10 most recent emails
        const startUid = Math.max(1, totalMessages - 9); // Get last 10 emails
        const endUid = totalMessages;

        const emails: EmailMessage[] = [];

        // Fetch messages in reverse order (newest first)
        for (let uid = endUid; uid >= startUid; uid--) {
          try {
            // Use a simpler approach to fetch message data
            const message = await client.fetchOne(uid, { 
              envelope: true,
              bodyStructure: true,
              flags: true
            });
            
            if (message) {
              // Extract email data
              const emailData: EmailMessage = {
                uid: uid.toString(),
                subject: message.envelope?.subject || '(No Subject)',
                from: message.envelope?.from?.[0]?.address || message.envelope?.from?.[0]?.name || 'Unknown',
                date: message.envelope?.date?.toISOString() || new Date().toISOString(),
                snippet: '',
                flags: Array.isArray(message.flags) ? message.flags : Array.from(message.flags || [])
              };

              // Try to get message body for snippet using a different approach
              try {
                // Try to get the first text part
                if (message.bodyStructure) {
                  const textPart = await client.download(uid, '1');
                  if (textPart && textPart.content) {
                    const textContent = textPart.content.toString();
                    // Create snippet (first 150 characters)
                    if (textContent) {
                      // Remove HTML tags if present
                      const plainText = textContent.replace(/<[^>]*>/g, '');
                      emailData.snippet = plainText.substring(0, 150).trim();
                      if (plainText.length > 150) {
                        emailData.snippet += '...';
                      }
                    }
                  }
                }
              } catch (bodyError) {
                // If we can't get body, continue without snippet
                console.log(`Could not fetch body for message ${uid}:`, bodyError);
              }

              emails.push(emailData);
            }
          } catch (messageError) {
            console.error(`Error fetching message ${uid}:`, messageError);
            // Continue with next message
          }
        }

        return NextResponse.json({
          emails,
          total: emails.length,
          message: `Successfully fetched ${emails.length} emails`
        });

      } finally {
        lock.release();
      }

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
        error: 'Failed to fetch emails',
        details: errorMessage
      }, { status: 500 });

    } finally {
      // Always try to logout
      try {
        await client.logout();
      } catch (logoutError) {
        // Ignore logout errors
      }
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 