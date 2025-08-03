import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import { ActivityHelpers } from '@/lib/activity-logger';

// GET - Fetch users with filters and pagination
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply role filter
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/users/management:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user has admin privileges
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const {
      email,
      full_name,
      role = 'user',
      phone,
      location,
      job_title,
      department,
      bio,
      birthday,
      linkedin_url,
      website_url,
    } = body;

    // Validate required fields
    if (!email || !full_name) {
      return NextResponse.json({ error: 'Email and full name are required' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        full_name,
        role,
        phone,
        location,
        job_title,
        department,
        bio,
        birthday,
        linkedin_url,
        website_url,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Log activity
    await ActivityHelpers.logUserCreated(session.user.id, newUser.id, full_name);

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/users/management:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    const { userId, ...updateData } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check permissions (admin can update anyone, users can update themselves)
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (currentUser?.role !== 'admin' && session.user.id !== userId) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Log activity
    await ActivityHelpers.logUserUpdated(session.user.id, userId, updatedUser.full_name);

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error in PUT /api/users/management:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(req: NextRequest) {
  try {
    console.log('🗑️ DELETE request received for user management');
    
    const session = await auth();
    if (!session?.user) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session found for user:', session.user.id);

    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    console.log('🔍 Attempting to delete user ID:', userId);

    if (!userId) {
      console.log('❌ No userId provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user has admin privileges
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (currentUserError) {
      console.error('❌ Error fetching current user:', currentUserError);
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    console.log('👤 Current user role:', currentUser?.role);

    if (currentUser?.role !== 'admin') {
      console.log('❌ User is not admin');
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Prevent self-deletion
    if (session.user.id === userId) {
      console.log('❌ User attempting to delete themselves');
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Get user details before deletion for logging
    const { data: userToDelete, error: fetchError } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching user to delete:', fetchError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('👤 User to delete:', userToDelete?.full_name, userToDelete?.email);

    // Check for related data that would prevent deletion
    console.log('🔍 Checking for related data...');
    
    // Check conversations created by this user
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, title')
      .eq('created_by', userId);

    if (conversationsError) {
      console.error('❌ Error checking conversations:', conversationsError);
    } else {
      console.log('💬 Found conversations created by user:', conversations?.length || 0);
    }

    // Check conversation participants
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (participantsError) {
      console.error('❌ Error checking conversation participants:', participantsError);
    } else {
      console.log('👥 Found conversation participations:', participants?.length || 0);
    }

    // Handle related data before deleting user
    if (conversations && conversations.length > 0) {
      console.log('🗑️ Deleting conversations created by user...');
      
      // Delete conversation participants first
      const conversationIds = conversations.map(c => c.id);
      const { error: deleteParticipantsError } = await supabase
        .from('conversation_participants')
        .delete()
        .in('conversation_id', conversationIds);

      if (deleteParticipantsError) {
        console.error('❌ Error deleting conversation participants:', deleteParticipantsError);
        return NextResponse.json({ error: 'Failed to clean up conversation data' }, { status: 500 });
      }

      // Delete conversations
      const { error: deleteConversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('created_by', userId);

      if (deleteConversationsError) {
        console.error('❌ Error deleting conversations:', deleteConversationsError);
        return NextResponse.json({ error: 'Failed to clean up conversations' }, { status: 500 });
      }

      console.log('✅ Conversations deleted successfully');
    }

    // Remove user from conversation participants
    if (participants && participants.length > 0) {
      console.log('👥 Removing user from conversation participants...');
      
      const { error: removeParticipantsError } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('user_id', userId);

      if (removeParticipantsError) {
        console.error('❌ Error removing user from participants:', removeParticipantsError);
        return NextResponse.json({ error: 'Failed to clean up participant data' }, { status: 500 });
      }

      console.log('✅ User removed from conversation participants');
    }

    // Now try to delete the user
    console.log('🗑️ Attempting to delete user...');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError);
      console.error('❌ Error details:', {
        message: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint
      });
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    console.log('✅ User deleted successfully');

    // Log activity
    try {
      await ActivityHelpers.logUserDeleted(session.user.id, userId, userToDelete?.full_name || 'Unknown User');
    } catch (logError) {
      console.error('⚠️ Error logging activity:', logError);
    }

    console.log('✅ DELETE operation completed successfully');
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('💥 Unexpected error in DELETE /api/users/management:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 