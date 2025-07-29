import { supabase } from './supabase';

export interface UserEmailCredentials {
  id: string;
  user_id: string;
  imap_username: string;
  imap_password: string;
  smtp_username: string;
  smtp_password: string;
  created_at: string;
  updated_at: string;
}

export async function getUserEmailCredentials(userId: string): Promise<UserEmailCredentials | null> {
  const { data, error } = await supabase
    .from('user_email_credentials')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function upsertUserEmailCredentials(
  userId: string,
  imap_username: string,
  imap_password: string,
  smtp_username: string,
  smtp_password: string
): Promise<UserEmailCredentials | null> {
  const { data, error } = await supabase
    .from('user_email_credentials')
    .upsert({
      user_id: userId,
      imap_username,
      imap_password,
      smtp_username,
      smtp_password,
      updated_at: new Date().toISOString(),
    }, { 
      onConflict: 'user_id'
    })
    .select()
    .single();
  if (error) return null;
  return data;
}
