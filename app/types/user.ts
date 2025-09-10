export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user' | 'commercial' | 'dev';
  created_at: string;
  profile_picture_url?: string;
  username?: string;
  phone?: string;
  location?: string;
  job_title?: string;
  department?: string;
  bio?: string;
  birthday?: string;
  linkedin_url?: string;
  website_url?: string;
}
