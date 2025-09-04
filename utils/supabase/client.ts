import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Create an authenticated client that can accept NextAuth session
export function createAuthenticatedClient(accessToken?: string) {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // If we have an access token, set it for authentication
  if (accessToken) {
    client.auth.setAuth(accessToken);
  }

  return client;
}