import { supabase } from './supabase';

export interface EmailReadStatus {
  id: string;
  user_id: string;
  email_message_id: string;
  mailbox: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export async function storeEmailIfNotExists(
  userId: string, 
  emailMessageId: string, 
  mailbox: string = 'INBOX'
): Promise<boolean> {
  const { error } = await supabase
    .from('email_read_status')
    .upsert({
      user_id: userId,
      email_message_id: emailMessageId,
      mailbox: mailbox,
      is_read: false,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,email_message_id,mailbox',
      ignoreDuplicates: true
    });
  
  return !error;
}

export async function markEmailAsRead(
  userId: string, 
  emailMessageId: string, 
  mailbox: string = 'INBOX'
): Promise<boolean> {
  const { error } = await supabase
    .from('email_read_status')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('email_message_id', emailMessageId)
    .eq('mailbox', mailbox);
  
  return !error;
}

export async function getReadEmailIds(
  userId: string, 
  mailbox: string = 'INBOX'
): Promise<string[]> {
  const { data, error } = await supabase
    .from('email_read_status')
    .select('email_message_id')
    .eq('user_id', userId)
    .eq('mailbox', mailbox)
    .eq('is_read', true);
    
  if (error) return [];
  return data.map(row => row.email_message_id);
}

export async function isEmailRead(
  userId: string, 
  emailMessageId: string, 
  mailbox: string = 'INBOX'
): Promise<boolean> {
  const { data, error } = await supabase
    .from('email_read_status')
    .select('id')
    .eq('user_id', userId)
    .eq('email_message_id', emailMessageId)
    .eq('mailbox', mailbox)
    .single();
    
  return !error && !!data;
}
