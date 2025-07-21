import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get the email ID from the URL
  const emailId = params.id;
  if (!emailId) {
    return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
  }

  // Get the authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized - No valid authorization header' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
  }
  const userEmail = user.email;
  if (!userEmail) {
    return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
  }

  try {
    // Fetch the email by ID
    const { data: email, error } = await supabase
      .from('emails')
      .select('*')
      .or(`from.eq.${userEmail},to.eq.${userEmail}`) // Get email if user is sender OR recipient
      .eq('uid', emailId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Check if the user has permission to view this email
    if (email.from !== userEmail && email.to !== userEmail) {
      return NextResponse.json({ error: 'You do not have permission to view this email' }, { status: 403 });
    }

    return NextResponse.json({ email });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 });
  }
}
