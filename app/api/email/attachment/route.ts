import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, attachmentId } = body;
    
    if (!userId || !attachmentId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get attachment info from database
    const { data: attachment, error: attachmentError } = await supabase
      .from('email_attachments')
      .select(`
        id,
        filename,
        content_type,
        size,
        storage_path,
        email_id,
        emails02!inner(user_id)
      `)
      .eq('id', attachmentId)
      .eq('emails02.user_id', userId)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Get file from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('email-attachments')
      .download(`${attachment.email_id}/${attachment.filename}`);

    if (storageError || !fileData) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    // Convert blob to buffer
    const buffer = await fileData.arrayBuffer();

    // Create response with file data
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.content_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
        'Content-Length': attachment.size?.toString() || '0',
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });

    return response;
  } catch (err: any) {
    console.error('Attachment download error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
