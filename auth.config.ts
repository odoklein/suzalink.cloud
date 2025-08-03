import type { NextAuthConfig } from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";
import { ActivityHelpers } from "@/lib/activity-logger";

export const authConfig: NextAuthConfig = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          return null;
        }

        try {
          console.log("🔐 Attempting Supabase auth for:", credentials.email);
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error) {
            console.error("❌ Supabase auth error:", error.message);
            return null;
          }

          if (!data.user) {
            console.error("❌ No user data returned from Supabase");
            return null;
          }

          console.log("✅ Supabase auth successful for user:", data.user.id);

          // Try to fetch user profile from users table (optional)
          let profile = null;
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (!profileError && profileData) {
              profile = profileData;
              console.log("✅ User profile found:", profile.full_name);
            }
          } catch (profileError) {
            console.log("⚠️  No user profile found, using auth user data");
          }

          // Return user data - prioritize profile data if available, otherwise use auth user data
          return {
            id: data.user.id,
            email: data.user.email!,
            name: profile?.full_name || data.user.email?.split('@')[0] || 'User',
            role: profile?.role || 'user',
            profile_picture_url: profile?.profile_picture_url,
            created_at: profile?.created_at || data.user.created_at,
            last_login: new Date().toISOString(),
          };
        } catch (error) {
          console.error("💥 Unexpected auth error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 15, // 15 minutes
      }
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 15, // 15 minutes
      }
    },
    nonce: {
      name: `next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.role = user.role;
        token.profile_picture_url = user.profile_picture_url;
        token.created_at = user.created_at;
        token.last_login = user.last_login;
      }
      
      // Handle session updates
      if (trigger === "update" && session) {
        token = { ...token, ...session.user };
      }
      
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.profile_picture_url = token.profile_picture_url as string;
        session.user.created_at = token.created_at as string;
        session.user.last_login = token.last_login as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
    signOut: '/login',
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Log successful sign-in
      console.log(`User ${user.email} signed in successfully`);
      
      // Update last login time in database
      if (user.id) {
        try {
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
          
          // Log login activity
          await ActivityHelpers.logUserLogin(user.id, `User ${user.email} logged in successfully`);
        } catch (error) {
          console.error('Failed to update last login:', error);
        }
      }
    },
    async signOut({ token }) {
      // Log sign out
      console.log(`User signed out`);
      
      if (token?.sub) {
        try {
          await ActivityHelpers.logUserLogout(token.sub, `User logged out`);
        } catch (error) {
          console.error('Failed to log logout activity:', error);
        }
      }
    },
    async session({ session, token }) {
      // Log session events
      console.log(`Session updated for user: ${session.user?.email}`);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === 'production',
}; 