import { supabase } from '@/lib/supabase';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Get current session using NextAuth
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse the form data
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const filePath = `profile-pictures/${session.user.id}.${fileExt}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('profile-pictures')
    .upload(filePath, file, { upsert: true, contentType: file.type });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);
  const publicUrl = publicUrlData?.publicUrl;

  // Update user profile
  const { error: updateError } = await supabase
    .from('users')
    .update({ profile_picture_url: publicUrl })
    .eq('id', session.user.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl }, { status: 200 });
} 