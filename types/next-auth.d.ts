import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      profile_picture_url?: string;
      created_at?: string;
      last_login?: string;
    };
    expires: string;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    profile_picture_url?: string;
    created_at?: string;
    last_login?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    profile_picture_url?: string;
    created_at?: string;
    last_login?: string;
  }
} 