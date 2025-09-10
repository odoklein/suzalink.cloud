import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user from Supabase auth
    // Get current session using NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: conversationId } = await params;

    // Check if user is a participant of this conversation
    const { data: participantCheck, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id)
      .single();

    if (participantError || !participantCheck) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Fetch participants with user details
    const { data: participants, error } = await supabase
      .from('conversation_participants')
      .select(`
        user_id,
        joined_at,
        user:users(id, full_name, email, profile_picture_url, role)
      `)
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Error fetching participants:', error);
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
    }

    // Flatten participants structure to match frontend expectations
    const flattenedParticipants = participants?.map((p: any) => ({
      user_id: p.user_id,
      joined_at: p.joined_at,
      id: p.user.id,
      full_name: p.user.full_name,
      email: p.user.email,
      profile_picture_url: p.user.profile_picture_url,
      role: p.user.role
    })) || [];

    return NextResponse.json({ participants: flattenedParticipants });
  } catch (error) {
    console.error('Error in participants GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user from Supabase auth
    // Get current session using NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id: conversationId } = await params;
    const { user_ids } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: 'user_ids array is required' }, { status: 400 });
    }

    // Check if conversation exists and user has permission to add participants
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('created_by, type')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Only creator can add participants to group chats
    if (conversation.type === 'group' && conversation.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Only conversation creator can add participants' }, { status: 403 });
    }

    // For direct messages, don't allow adding participants
    if (conversation.type === 'direct') {
      return NextResponse.json({ error: 'Cannot add participants to direct messages' }, { status: 400 });
    }

    // Check if user is a participant
    const { data: participantCheck, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id)
      .single();

    if (participantError || !participantCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify users exist
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id')
      .in('id', user_ids);

    if (usersError) {
      console.error('Error verifying users:', usersError);
      return NextResponse.json({ error: 'Failed to verify users' }, { status: 500 });
    }

    const existingUserIds = existingUsers?.map(u => u.id) || [];
    const invalidUserIds = user_ids.filter(id => !existingUserIds.includes(id));

    if (invalidUserIds.length > 0) {
      return NextResponse.json({
        error: 'Some users not found',
        invalid_user_ids: invalidUserIds
      }, { status: 400 });
    }

    // Check which users are already participants
    const { data: existingParticipants, error: existingError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .in('user_id', user_ids);

    if (existingError) {
      console.error('Error checking existing participants:', existingError);
      return NextResponse.json({ error: 'Failed to check existing participants' }, { status: 500 });
    }

    const existingParticipantIds = existingParticipants?.map(p => p.user_id) || [];
    const newUserIds = user_ids.filter(id => !existingParticipantIds.includes(id));

    if (newUserIds.length === 0) {
      return NextResponse.json({ message: 'All users are already participants' });
    }

    // Add new participants
    const participantsData = newUserIds.map(userId => ({
      conversation_id: conversationId,
      user_id: userId
    }));

    const { error: insertError } = await supabase
      .from('conversation_participants')
      .insert(participantsData);

    if (insertError) {
      console.error('Error adding participants:', insertError);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({
      message: 'Participants added successfully',
      added_users: newUserIds.length
    });
  } catch (error) {
    console.error('Error in participants POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user from Supabase auth
    // Get current session using NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const { id: conversationId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'user_id parameter is required' }, { status: 400 });
    }

    // Users can remove themselves, creators can remove others
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('created_by, type')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Can't remove participants from direct messages
    if (conversation.type === 'direct') {
      return NextResponse.json({ error: 'Cannot remove participants from direct messages' }, { status: 400 });
    }

    const canRemove = userId === session.user.id || conversation.created_by === session.user.id;

    if (!canRemove) {
      return NextResponse.json({ error: 'Can only remove yourself or as conversation creator' }, { status: 403 });
    }

    // Check if user is actually a participant
    const { data: participantCheck, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participantCheck) {
      return NextResponse.json({ error: 'User is not a participant' }, { status: 404 });
    }

    // Remove participant
    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing participant:', error);
      return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 });
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Error in participants DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
