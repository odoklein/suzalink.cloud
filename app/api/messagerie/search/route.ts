import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all'; // 'conversations', 'messages', 'all'

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        conversations: [], 
        messages: [], 
        users: [] 
      });
    }

    const supabase = await createServerSupabaseClient();

    const results: any = {
      conversations: [],
      messages: [],
      users: []
    };

    // Search conversations
    if (type === 'all' || type === 'conversations') {
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user:users(id, full_name, email, profile_picture_url)
          ),
          last_message:messages(
            id, content, sent_at,
            sender:users(id, full_name, email, profile_picture_url)
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_archived', false)
        .limit(10);

      if (!convError && conversations) {
        results.conversations = conversations;
      }
    }

    // Search messages
    if (type === 'all' || type === 'messages') {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(id, full_name, email, profile_picture_url),
          conversation:conversations(id, title, type)
        `)
        .ilike('content', `%${query}%`)
        .eq('is_deleted', false)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (!msgError && messages) {
        results.messages = messages;
      }
    }

    // Search users
    if (type === 'all' || type === 'users') {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email, profile_picture_url')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', session.user.id)
        .limit(10);

      if (!userError && users) {
        results.users = users;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
