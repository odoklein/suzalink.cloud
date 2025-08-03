import { supabase } from '../lib/supabase';

// Sample activity data for demonstration
const sampleActivities = [
  {
    user_id: '', // Will be filled with actual user ID
    action: 'user_login',
    details: 'User logged in successfully',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
  },
  {
    user_id: '',
    action: 'user_profile_viewed',
    details: 'Viewed profile of: John Doe',
    target_user_id: '', // Will be filled with actual user ID
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
  },
  {
    user_id: '',
    action: 'project_created',
    details: 'Created project: Website Redesign',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    user_id: '',
    action: 'client_contacted',
    details: 'Contacted client ABC Corp via email',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
  },
  {
    user_id: '',
    action: 'email_sent',
    details: 'Sent email to client@example.com: Project Update',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
  },
  {
    user_id: '',
    action: 'booking_created',
    details: 'Created booking: Consultation on 2024-01-15',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
  },
  {
    user_id: '',
    action: 'prospect_created',
    details: 'Created prospect: Jane Smith',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
  },
  {
    user_id: '',
    action: 'user_updated',
    details: 'Updated user profile: Sarah Johnson',
    target_user_id: '',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(), // 7 hours ago
  },
  {
    user_id: '',
    action: 'settings_updated',
    details: 'Updated notification preferences',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
  },
  {
    user_id: '',
    action: 'data_exported',
    details: 'Exported client list to CSV',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(), // 9 hours ago
  },
];

async function seedActivityData() {
  try {
    console.log('🌱 Starting activity data seeding...');

    // Get all users to use their IDs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️ No users found. Please create users first.');
      return;
    }

    console.log(`📊 Found ${users.length} users`);

    // Create activities for each user
    const activitiesToInsert = [];

    for (const user of users) {
      // Create 2-3 activities per user
      const userActivities = sampleActivities.slice(0, 3).map(activity => ({
        ...activity,
        user_id: user.id,
        target_user_id: activity.target_user_id ? users[Math.floor(Math.random() * users.length)].id : null,
      }));

      activitiesToInsert.push(...userActivities);
    }

    // Insert all activities
    const { data: insertedActivities, error: insertError } = await supabase
      .from('user_activity')
      .insert(activitiesToInsert)
      .select();

    if (insertError) {
      console.error('❌ Error inserting activities:', insertError);
      return;
    }

    console.log(`✅ Successfully inserted ${insertedActivities?.length || 0} activity records`);
    console.log('🎉 Activity data seeding completed!');

    // Show some sample data
    const { data: recentActivities } = await supabase
      .from('user_activity')
      .select(`
        *,
        user:users!user_activity_user_id_fkey(full_name),
        target_user:users!user_activity_target_user_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('\n📋 Recent activities:');
    recentActivities?.forEach(activity => {
      const userName = activity.user?.full_name || 'Unknown User';
      const targetUserName = activity.target_user?.full_name || '';
      console.log(`  • ${userName}: ${activity.details} (${new Date(activity.created_at).toLocaleString()})`);
    });

  } catch (error) {
    console.error('💥 Unexpected error during seeding:', error);
  }
}

// Run the seeding function
seedActivityData(); 