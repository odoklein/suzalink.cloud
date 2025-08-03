import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserEmailCredentials } from '@/lib/user-email-credentials';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, folderName = 'INBOX' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get user credentials
    const creds = await getUserEmailCredentials(userId);
    if (!creds) {
      return NextResponse.json({ error: 'No credentials found' }, { status: 404 });
    }

    // Get or create folder
    const folder = await getOrCreateFolder(userId, folderName);
    if (!folder) {
      return NextResponse.json({ error: 'Could not get folder' }, { status: 500 });
    }

    // Connect to IMAP
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
      console.log('Connected to IMAP server for sync');

      // Try to open the mailbox
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
      if (!(await tryMailbox(folder.imap_path))) {
        // Try alternative names
        const altNames = alternatives[folderName];
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
        throw new Error(`Could not open mailbox: ${folder.imap_path}`);
      }

      const totalMessages = selectedMailbox.exists;
      console.log(`Total messages in mailbox: ${totalMessages}`);

      if (totalMessages === 0) {
        await client.logout();
        return NextResponse.json({ 
          synced: 0, 
          new: 0, 
          updated: 0,
          message: 'No messages to sync'
        });
      }

      // Get existing emails from database
      const { data: existingEmails } = await supabase
        .from('emails')
        .select('imap_uid, message_id')
        .eq('user_id', userId)
        .eq('folder_id', folder.id)
        .eq('is_deleted', false);

      const existingUids = new Set(existingEmails?.map(e => e.imap_uid) || []);
      const existingMessageIds = new Set(existingEmails?.map(e => e.message_id) || []);

      let synced = 0;
      let newEmails = 0;
      let updatedEmails = 0;

      // Fetch all messages
      for await (const message of client.fetch('1:*', {
        envelope: true,
        bodyStructure: true,
        source: true,
        flags: true,
        uid: true,
      })) {
        try {
          if (!message.source) {
            console.log(`No source for message UID: ${message.uid}`);
            continue;
          }

          const fullMessage = message.source.toString('utf8');
          const parsed = await simpleParser(fullMessage);

          // Check if email already exists
          const emailExists = existingUids.has(message.uid) || existingMessageIds.has(parsed.messageId || '');

          if (emailExists) {
            // Update existing email
            await updateEmailInDatabase(userId, folder.id, message, parsed, fullMessage);
            updatedEmails++;
          } else {
            // Insert new email
            await insertEmailInDatabase(userId, folder.id, message, parsed, fullMessage);
            newEmails++;
          }

          synced++;
        } catch (err) {
          console.error('Error processing message:', err);
        }
      }

      await client.logout();

      return NextResponse.json({
        synced,
        new: newEmails,
        updated: updatedEmails,
        message: `Synced ${synced} emails (${newEmails} new, ${updatedEmails} updated)`
      });

    } catch (err: any) {
      console.error('IMAP sync error:', err);
      try {
        await client.logout();
      } catch (logoutErr) {
        console.error('Logout error:', logoutErr);
      }
      throw err;
    }

  } catch (error) {
    console.error('Sync error:', error);
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

  // Try to get existing folder
  let { data: folder, error } = await supabase
    .from('email_folders')
    .select('*')
    .eq('user_id', userId)
    .eq('name', folderName)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting folder:', error);
    return null;
  }

  // Create folder if it doesn't exist
  if (!folder) {
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
      console.error('Error creating folder:', createError);
      return null;
    }

    folder = newFolder;
  }

  return folder;
}

async function insertEmailInDatabase(userId: string, folderId: number, message: any, parsed: any, rawContent: string) {
  // Extract from information
  let fromAddress = 'unknown@example.com';
  let fromName = '';
  
  if (parsed.from) {
    if (typeof parsed.from === 'string') {
      fromAddress = parsed.from;
    } else if ((parsed.from as any).value && (parsed.from as any).value.length > 0) {
      const addr = (parsed.from as any).value[0];
      fromAddress = addr.address;
      fromName = addr.name || '';
    }
  }

  // Insert email
  const { data: email, error } = await supabase
    .from('emails')
    .insert({
      user_id: userId,
      folder_id: folderId,
      message_id: parsed.messageId || `${Date.now()}-${Math.random()}`,
      imap_uid: message.uid,
      from_address: fromAddress,
      from_name: fromName,
      to_address: parsed.to?.text || '',
      cc_address: parsed.cc?.text || '',
      bcc_address: parsed.bcc?.text || '',
      subject: parsed.subject || '(Sans objet)',
      text_content: parsed.text || '',
      html_content: parsed.html || '',
      raw_content: rawContent,
      date_received: parsed.date || new Date(),
      size_bytes: message.source?.length || 0,
      flags: Array.from(message.flags || []),
      is_read: message.flags && Array.from(message.flags).includes('\\Seen'),
      is_starred: message.flags && Array.from(message.flags).includes('\\Flagged'),
      is_deleted: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting email:', error);
    return;
  }

  // Insert attachments
  if (parsed.attachments && parsed.attachments.length > 0) {
    for (const attachment of parsed.attachments) {
      if (attachment.filename) {
        await supabase
          .from('email_attachments')
          .insert({
            email_id: email.id,
            filename: attachment.filename,
            content_type: attachment.contentType || 'application/octet-stream',
            size_bytes: attachment.size || 0,
            content_id: attachment.contentId || null,
            is_inline: attachment.contentId ? true : false
          });
      }
    }
  }
}

async function updateEmailInDatabase(userId: string, folderId: number, message: any, parsed: any, rawContent: string) {
  // Update email flags and content
  await supabase
    .from('emails')
    .update({
      flags: Array.from(message.flags || []),
      is_read: message.flags && Array.from(message.flags).includes('\\Seen'),
      is_starred: message.flags && Array.from(message.flags).includes('\\Flagged'),
      updated_at: new Date()
    })
    .eq('user_id', userId)
    .eq('folder_id', folderId)
    .eq('imap_uid', message.uid);
} 