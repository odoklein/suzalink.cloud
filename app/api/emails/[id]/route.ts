import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const emailId = parseInt(id);
    const body = await req.json();
    const { userId, isRead, isStarred, isDeleted, folderId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Build update object
    const updateData: any = {};
    
    if (typeof isRead === 'boolean') {
      updateData.is_read = isRead;
      updateData.flags = isRead ? ['\\Seen'] : [];
    }
    
    if (typeof isStarred === 'boolean') {
      updateData.is_starred = isStarred;
    }
    
    if (typeof isDeleted === 'boolean') {
      updateData.is_deleted = isDeleted;
    }
    
    if (folderId) {
      updateData.folder_id = folderId;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    // Update email
    const { data: email, error } = await supabase
      .from('emails')
      .update(updateData)
      .eq('id', emailId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating email:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      email: {
        id: email.id,
        isRead: email.is_read,
        isStarred: email.is_starred,
        isDeleted: email.is_deleted,
        folderId: email.folder_id
      }
    });

  } catch (error: any) {
    console.error('Email update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const emailId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Mark email as deleted
    const { error } = await supabase
      .from('emails')
      .update({ is_deleted: true })
      .eq('id', emailId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting email:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Email delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 