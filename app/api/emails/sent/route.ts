import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSentEmailsForUser } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
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
    const emails = await getSentEmailsForUser(userEmail);
    return NextResponse.json({ emails });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch sent emails' }, { status: 500 });
  }
}
