import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    if (!process.env.TITAN_EMAIL_PASSWORD) {
      return NextResponse.json({ error: 'Server configuration error: missing TITAN_EMAIL_PASSWORD' }, { status: 500 });
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid authorization header' },
        { status: 401 }
      );
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
    }

    const client = new ImapFlow({
      host: 'imap.titan.email',
      port: 993,
      secure: true,
      auth: {
        user: userEmail,
        pass: process.env.TITAN_EMAIL_PASSWORD,
      },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const mailbox = await client.mailboxOpen('INBOX');
        const totalMessages = mailbox.exists;
        if (totalMessages === 0) {
          return NextResponse.json({ emails: [], total: 0 });
        }
        const startUid = Math.max(1, totalMessages - 9);
        const endUid = totalMessages;
        const emails = [];
        for (let uid = endUid; uid >= startUid; uid--) {
          try {
            const message = await client.fetchOne(uid, { envelope: true });
            if (message) {
              emails.push({
                uid: uid.toString(),
                subject: message.envelope?.subject || '(No Subject)',
                from: message.envelope?.from?.[0]?.address || message.envelope?.from?.[0]?.name || 'Unknown',
                date: message.envelope?.date?.toISOString() || new Date().toISOString(),
              });
            }
          } catch {}
        }
        return NextResponse.json({ emails, total: emails.length });
      } finally {
        lock.release();
      }
    } catch (imapError) {
      try { await client.logout(); } catch {}
      let errorMsg = 'Unknown IMAP error';
      if (imapError && typeof imapError === 'object' && 'message' in imapError) {
        errorMsg = (imapError as any).message;
      }
      return NextResponse.json({ error: 'Failed to fetch emails', details: errorMsg }, { status: 500 });
    } finally {
      try { await client.logout(); } catch {}
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 