import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  // Parse the form data
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
  }

  // Get user from JWT (Authorization header)
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid user' }), { status: 401 });
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const filePath = `profile-pictures/${user.id}.${fileExt}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('profile-pictures')
    .upload(filePath, file, { upsert: true, contentType: file.type });
  if (uploadError) {
    return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);
  const publicUrl = publicUrlData?.publicUrl;

  // Update user profile
  const { error: updateError } = await supabase
    .from('users')
    .update({ profile_picture_url: publicUrl })
    .eq('id', user.id);
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ url: publicUrl }), { status: 200 });
} 