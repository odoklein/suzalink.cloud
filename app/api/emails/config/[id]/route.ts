import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = params.id;
    const supabase = await createServerSupabaseClient();

    // Verify the config belongs to the user
    const { data: config, error: fetchError } = await supabase
      .from('user_email_configs')
      .select('id, user_id')
      .eq('id', configId)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !config) {
      return NextResponse.json({ error: 'Email configuration not found' }, { status: 404 });
    }

    // Delete the configuration (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('user_email_configs')
      .delete()
      .eq('id', configId)
      .eq('user_id', session.user.id);

    if (deleteError) {
      console.error('Error deleting email config:', deleteError);
      return NextResponse.json({ error: 'Failed to delete email configuration' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Email configuration deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

