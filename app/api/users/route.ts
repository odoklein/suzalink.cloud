import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role')
    .order('full_name');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ users: data }), { status: 200 });
} 