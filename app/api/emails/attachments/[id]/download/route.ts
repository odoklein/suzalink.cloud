import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attachmentId = params.id;
    const supabase = await createServerSupabaseClient();

    // Fetch attachment details
    const { data: attachment, error: attachmentError } = await supabase
      .from('email_attachments')
      .select(`
        id,
        filename,
        content_type,
        storage_path,
        personal_emails!inner(user_id)
      `)
      .eq('id', attachmentId)
      .eq('personal_emails.user_id', session.user.id)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Download from Supabase storage
    const { data, error: downloadError } = await supabase.storage
      .from('email-attachments')
      .download(attachment.storage_path);

    if (downloadError || !data) {
      console.error('Error downloading attachment:', downloadError);
      return NextResponse.json({ error: 'Failed to download attachment' }, { status: 500 });
    }

    // Convert blob to buffer for response
    const buffer = await data.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.content_type,
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

