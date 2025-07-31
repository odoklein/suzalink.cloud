import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailCredentials } from '@/lib/user-email-credentials';
import { getEmailConfig } from '@/lib/email-config';
import { supabase } from '@/lib/supabase';
import Imap from 'node-imap';
import { simpleParser } from 'mailparser';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, mailbox = 'INBOX', limit = 10 } = body;
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    const creds = await getUserEmailCredentials(userId);
    if (!creds) {
      return NextResponse.json({ error: 'No credentials found' }, { status: 404 });
    }
    const emailConfig = getEmailConfig();
    return await new Promise<NextResponse>((resolve) => {
      const imap = new Imap({
        user: creds.imap_username,
        password: creds.imap_password,
        host: emailConfig.IMAP_HOST,
        port: emailConfig.IMAP_PORT,
        tls: emailConfig.IMAP_SECURE,
      });
      function openMailbox(cb: any) {
        console.log(`Opening mailbox: ${mailbox}`);
        imap.openBox(mailbox, true, (err: any, box: any) => {
          if (err) {
            // Try alternative folder names for sent emails
            const alternatives: Record<string, string[]> = {
              'Sent': ['INBOX.Sent', 'Sent Messages', 'Sent Items', 'Outbox'],
              'Drafts': ['INBOX.Drafts', 'Draft'],
              'Trash': ['INBOX.Trash', 'Deleted', 'Deleted Messages']
            };
            
            const altNames = alternatives[mailbox];
            if (altNames && altNames.length > 0) {
              const tryNext = (index: number) => {
                if (index >= altNames.length) {
                  cb(err, null);
                  return;
                }
                imap.openBox(altNames[index], true, (altErr: any, altBox: any) => {
                  if (altErr) {
                    tryNext(index + 1);
                  } else {
                    console.log(`Successfully opened alternative mailbox: ${altNames[index]}`);
                    cb(null, altBox);
                  }
                });
              };
              tryNext(0);
            } else {
              cb(err, box);
            }
          } else {
            cb(null, box);
          }
        });
      }
      imap.once('ready', function() {
        openMailbox(function(err: any, box: any) {
          if (err) {
            imap.end();
            resolve(NextResponse.json({ error: err.message }, { status: 500 }));
            return;
          }
          const fetch = imap.seq.fetch(`${Math.max(1, box.messages.total - limit + 1)}:*`, { bodies: '', struct: true });
          const emails: any[] = [];
          fetch.on('message', function(msg: any) {
            const email: any = {};
            let fullMessage = '';
            
            msg.on('body', function(stream: any, info: any) {
              stream.on('data', function(chunk: any) {
                fullMessage += chunk.toString('utf8');
              });
              stream.on('end', async function() {
                // Parse the entire email message
                try {
                  const parsed = await simpleParser(fullMessage);
                  const emailData = {
                    from: parsed.from?.text || parsed.from?.value?.[0]?.address || null,
                    subject: parsed.subject || null,
                    date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
                    text: parsed.text || '',
                    html: parsed.html || '',
                    messageId: parsed.messageId || `${Date.now()}-${Math.random()}`,
                    rawContent: fullMessage
                  };

                  console.log('Parsed email data:', {
                    from: emailData.from,
                    subject: emailData.subject,
                    parsedFrom: parsed.from,
                    parsedSubject: parsed.subject
                  });

                  // Process attachments (no database storage)
                  const attachments: any[] = [];
                  if (parsed.attachments && parsed.attachments.length > 0) {
                    for (let i = 0; i < parsed.attachments.length; i++) {
                      const att = parsed.attachments[i];
                      if (att.filename) {
                        attachments.push({
                          id: `${Date.now()}-${i}`, // Generate temporary ID
                          filename: att.filename,
                          contentType: att.contentType || 'application/octet-stream',
                          size: att.size || 0
                        });
                      }
                    }
                  }

                  email.from = emailData.from;
                  email.subject = emailData.subject;
                  email.date = emailData.date;
                  email.text = emailData.text;
                  email.html = emailData.html;
                  email.attachments = attachments;
                  email.id = Date.now() + Math.random(); // Generate temporary ID
                } catch (err) {
                  console.error('Email parsing error:', err);
                  // Fallback parsing
                  email.from = null;
                  email.subject = null;
                  email.date = new Date().toISOString();
                  email.text = fullMessage.substring(0, 200);
                  email.html = '';
                  email.attachments = [];
                }
              });
            });
            
            msg.once('attributes', function(attrs: any) {
              email.attrs = attrs;
            });
            
            msg.once('end', function() {
              emails.push(email);
            });
          });
          fetch.once('end', function() {
            imap.end();
            resolve(NextResponse.json({ emails }, { status: 200 }));
          });
        });
      });
      imap.once('error', function(err: any) {
        resolve(NextResponse.json({ error: err.message }, { status: 500 }));
      });
      imap.connect();
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
