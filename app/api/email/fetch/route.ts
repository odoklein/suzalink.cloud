import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailCredentials } from '@/lib/user-email-credentials';
import Imap from 'node-imap';
import { simpleParser } from 'mailparser';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, mailbox = 'INBOX', limit = 20 } = body;
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    const creds = await getUserEmailCredentials(userId);
    if (!creds) {
      return NextResponse.json({ error: 'No credentials found' }, { status: 404 });
    }
    return await new Promise<NextResponse>((resolve) => {
      const imap = new Imap({
        user: creds.imap_username,
        password: creds.imap_password,
        host: process.env.IMAP_HOST,
        port: Number(process.env.IMAP_PORT) || 993,
        tls: String(process.env.IMAP_SECURE) === 'true',
      });
      function openInbox(cb: any) {
        imap.openBox(mailbox, true, cb);
      }
      imap.once('ready', function() {
        openInbox(function(err: any, box: any) {
          if (err) {
            imap.end();
            resolve(NextResponse.json({ error: err.message }, { status: 500 }));
            return;
          }
          const fetch = imap.seq.fetch(`${Math.max(1, box.messages.total - limit + 1)}:*`, { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'], struct: true });
          const emails: any[] = [];
          fetch.on('message', function(msg: any) {
            const email: any = {};
            msg.on('body', function(stream: any, info: any) {
              let buffer = '';
              stream.on('data', function(chunk: any) {
                buffer += chunk.toString('utf8');
              });
              stream.on('end', async function() {
                if (info.which.startsWith('HEADER')) {
                  email.header = buffer;
                } else {
                  // Use mailparser to decode and parse the email body
                  try {
                    const parsed = await simpleParser(buffer);
                    email.from = parsed.from?.text || '';
                    email.subject = parsed.subject || '';
                    email.date = parsed.date ? parsed.date.toISOString() : '';
                    email.text = parsed.text || '';
                    email.html = parsed.html || '';
                  } catch (err) {
                    email.body = buffer; // fallback
                  }
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
