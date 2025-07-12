import { NextRequest, NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Titan Mail IMAP settings
    const imap_host = 'imap.titan.email';
    const imap_port = 993;

    const client = new ImapFlow({
      host: imap_host,
      port: imap_port,
      secure: true,
      auth: {
        user: email,
        pass: password
      },
      logger: false
    });

    try {
      await client.connect();
      // Test authentication by opening INBOX
      const lock = await client.getMailboxLock('INBOX');
      try {
        await client.mailboxOpen('INBOX');
      } finally {
        lock.release();
      }
      await client.logout();
      return NextResponse.json({ success: true });
    } catch (imapError) {
      try { await client.logout(); } catch {}
      const errorMessage = imapError instanceof Error ? imapError.message : 'Unknown IMAP error';
      return NextResponse.json({ success: false, error: errorMessage }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 