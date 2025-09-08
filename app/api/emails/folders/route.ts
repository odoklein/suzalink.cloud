import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('email_folders')
      .select(`
        id,
        folder_name,
        folder_path,
        folder_type,
        message_count,
        unread_count,
        email_config_id
      `)
      .eq('user_id', session.user.id)
      .order('folder_type', { ascending: false }) // System folders first
      .order('folder_name', { ascending: true });

    if (error) {
      console.error('Error fetching email folders:', error);
      return NextResponse.json({ error: 'Failed to fetch email folders' }, { status: 500 });
    }

    // Transform snake_case to camelCase for frontend
    const transformedData = data?.map(folder => ({
      id: folder.id,
      folderName: folder.folder_name,
      folderPath: folder.folder_path,
      folderType: folder.folder_type,
      messageCount: folder.message_count,
      unreadCount: folder.unread_count,
      emailConfigId: folder.email_config_id
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
