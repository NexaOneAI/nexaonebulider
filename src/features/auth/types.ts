// Auth feature types
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  plan: Plan;
  credits: number;
  is_unlimited: boolean;
  webcontainers_enabled: boolean;
  created_at: string;
}

export type Plan = 'free' | 'starter' | 'pro' | 'enterprise';

export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  session: import('@supabase/supabase-js').Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
}
