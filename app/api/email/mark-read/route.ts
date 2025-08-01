import { NextRequest, NextResponse } from 'next/server';
import { markEmailAsRead } from '@/lib/email-read-status';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, emailMessageId, mailbox = 'INBOX' } = body;

    if (!userId || !emailMessageId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const success = await markEmailAsRead(userId, emailMessageId, mailbox);
    
    if (success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Failed to mark email as read' }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
