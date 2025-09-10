import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;
    const supabase = createClient();

    // Get read status for the message
    const { data: readStatus, error } = await supabase.rpc('get_message_read_status', {
      message_id_param: messageId
    });

    if (error) {
      console.error('Error getting message read status:', error);
      return NextResponse.json({ error: 'Failed to get read status' }, { status: 500 });
    }

    return NextResponse.json({ readStatus });
  } catch (error) {
    console.error('Error in read-status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
