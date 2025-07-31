import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, limit = 10 } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Fetch emails from database
    const { data: emails, error } = await supabase
      .from('emails02')
      .select(`
        id,
        message_id,
        subject,
        from,
        to,
        date,
        html_content,
        text_content,
        created_at,
        email_attachments (
          id,
          filename,
          content_type,
          size,
          content_id,
          is_inline
        )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    console.log('Database query result:', { emails, error, userId });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to match expected format
    const transformedEmails = emails?.map((email: any, index: number) => ({
      id: email.id,
      from: email.from || 'Expéditeur inconnu',
      subject: email.subject || '(Sans objet)',
      date: email.date || email.created_at,
      text: email.text_content || '',
      html: email.html_content || '',
      labels: ['Inbox'], // Default label
      attachments: email.email_attachments?.map((att: any) => ({
        id: att.id,
        filename: att.filename,
        contentType: att.content_type,
        size: att.size
      })) || [],
      read: false,
      starred: false,
    })) || [];

    return NextResponse.json({ emails: transformedEmails }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
