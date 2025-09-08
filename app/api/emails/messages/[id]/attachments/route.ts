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

    const emailId = (await params).id;
    const supabase = await createServerSupabaseClient();

    // First verify the email belongs to the user
    const { data: email, error: emailError } = await supabase
      .from('personal_emails')
      .select('id')
      .eq('id', emailId)
      .eq('user_id', session.user.id)
      .single();

    if (emailError || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Fetch attachments
    const { data, error } = await supabase
      .from('email_attachments')
      .select(`
        id,
        filename,
        content_type,
        size_bytes,
        attachment_order
      `)
      .eq('email_id', emailId)
      .order('attachment_order', { ascending: true });

    if (error) {
      console.error('Error fetching attachments:', error);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
