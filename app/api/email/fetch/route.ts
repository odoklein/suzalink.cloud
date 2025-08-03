import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailCredentials } from '@/lib/user-email-credentials';
import { getEmailConfig } from '@/lib/email-config';
import { supabase } from '@/lib/supabase';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, mailbox = 'INBOX', limit = 50 } = body; // Limited to 50 emails maximum
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    
    const creds = await getUserEmailCredentials(userId);
    if (!creds) {
      return NextResponse.json({ error: 'No credentials found' }, { status: 404 });
    }

    const client = new ImapFlow({
      host: 'imap.titan.email',
      port: 993,
      secure: true,
      auth: {
        user: creds.imap_username,
        pass: creds.imap_password,
      },
    });

    try {
      await client.connect();
      console.log('Connected to IMAP server');

      // Try to open the mailbox, with fallback alternatives
      let selectedMailbox: any = null;
      const alternatives: Record<string, string[]> = {
        'Sent': ['INBOX.Sent', 'Sent Messages', 'Sent Items', 'Outbox'],
        'Drafts': ['INBOX.Drafts', 'Draft'],
        'Trash': ['INBOX.Trash', 'Deleted', 'Deleted Messages']
      };

      const tryMailbox = async (mailboxName: string): Promise<boolean> => {
        try {
          selectedMailbox = await client.mailboxOpen(mailboxName);
          console.log(`Successfully opened mailbox: ${mailboxName}, messages: ${selectedMailbox.exists}`);
          return true;
        } catch (err) {
          console.log(`Failed to open mailbox: ${mailboxName}`, err);
          return false;
        }
      };

      // Try the original mailbox first
      if (!(await tryMailbox(mailbox))) {
        // Try alternative names
        const altNames = alternatives[mailbox];
        if (altNames) {
          for (const altName of altNames) {
            if (await tryMailbox(altName)) {
              console.log(`Successfully opened alternative mailbox: ${altName}`);
              break;
            }
          }
        }
      }

      if (!selectedMailbox) {
        throw new Error(`Could not open mailbox: ${mailbox}`);
      }

      // Get total message count
      const totalMessages = selectedMailbox.exists;
      console.log(`Total messages in mailbox: ${totalMessages}`);

      if (totalMessages === 0) {
        await client.logout();
        return NextResponse.json({ emails: [] }, { status: 200 });
      }

      // Calculate the range to fetch (get all messages)
      const startSeq = 1;
      const endSeq = Math.min(totalMessages, limit);
      
      console.log(`Fetching messages from ${startSeq} to ${endSeq} (total: ${totalMessages})`);

      const emails: any[] = [];

      // Fetch messages using sequence range
      const fetchRange = `${startSeq}:${endSeq}`;
      console.log(`Fetch range: ${fetchRange}`);

      for await (const message of client.fetch(fetchRange, {
        envelope: true,
        bodyStructure: true,
        source: true,
        flags: true,
        uid: true,
      })) {
        try {
          console.log(`Processing message UID: ${message.uid}`);
          
          if (!message.source) {
            console.log(`No source for message UID: ${message.uid}`);
            continue;
          }
          
          const fullMessage = message.source.toString('utf8');
          const parsed = await simpleParser(fullMessage);

          // More robust from field parsing
          let fromValue = 'Expéditeur inconnu';
          if (parsed.from) {
            if (typeof parsed.from === 'string') {
              fromValue = parsed.from;
            } else if ((parsed.from as any).text) {
              fromValue = (parsed.from as any).text;
            } else if ((parsed.from as any).value && (parsed.from as any).value.length > 0) {
              const addr = (parsed.from as any).value[0];
              fromValue = addr.name ? `${addr.name} <${addr.address}>` : addr.address;
            } else if ((parsed.from as any).address) {
              fromValue = (parsed.from as any).address;
            }
          }

          // More robust subject parsing  
          let subjectValue = '(Sans objet)';
          if (parsed.subject) {
            if (typeof parsed.subject === 'string') {
              subjectValue = parsed.subject;
            } else if ((parsed.subject as any).text) {
              subjectValue = (parsed.subject as any).text;
            }
          }

          // Process attachments
          const attachments: any[] = [];
          if (parsed.attachments && parsed.attachments.length > 0) {
            for (let i = 0; i < parsed.attachments.length; i++) {
              const att = parsed.attachments[i];
              if (att.filename) {
                attachments.push({
                  id: `${Date.now()}-${i}`,
                  filename: att.filename,
                  contentType: att.contentType || 'application/octet-stream',
                  size: att.size || 0
                });
              }
            }
          }

          const email = {
            id: Date.now() + Math.random(),
            from: fromValue,
            subject: subjectValue,
            date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
            text: parsed.text || '',
            html: parsed.html || '',
            messageId: parsed.messageId || `${Date.now()}-${Math.random()}`,
            rawContent: fullMessage,
            attachments,
            read: message.flags && Array.from(message.flags).includes('\\Seen'),
            attrs: {
              uid: message.uid,
              flags: message.flags
            }
          };

          console.log('Parsed email data:', {
            from: email.from,
            subject: email.subject,
            uid: message.uid
          });

          emails.push(email);
        } catch (err) {
          console.error('Email parsing error:', err);
          // Skip this email and continue with the next one
        }
      }

      console.log(`Successfully processed ${emails.length} emails`);
      await client.logout();
      return NextResponse.json({ emails }, { status: 200 });

    } catch (err: any) {
      console.error('IMAP operation error:', err);
      try {
        await client.logout();
      } catch (logoutErr) {
        console.error('Logout error:', logoutErr);
      }
      throw err;
    }

  } catch (err: any) {
    console.error('IMAP error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
