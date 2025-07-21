import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service_role key on the server (API), anon key on the client
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch sent emails for a user by sender email address.
 * @param userEmail The user's email address
 * @returns Array of sent emails
 */
export async function getSentEmailsForUser(userEmail: string) {
  const { data, error } = await supabase
    .from('emails')
    .select('*')
    .eq('from', userEmail)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
}