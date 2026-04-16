import { supabase } from '@/integrations/supabase/client';
import type { LoginInput, RegisterInput } from '@/lib/validators';
import type { Profile } from './types';

export const authService = {
  async signIn({ email, password }: LoginInput) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp({ email, password, full_name }: RegisterInput) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      avatar_url: data.avatar_url,
      plan: data.plan,
      credits: data.credits,
      is_unlimited: data.is_unlimited,
      created_at: data.created_at,
      role: 'user', // role comes from user_roles table
    };
  },

  async getUserRole(userId: string): Promise<'user' | 'admin'> {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const roles = data?.map((r) => r.role) ?? [];
    return roles.includes('admin') ? 'admin' : 'user';
  },

  onAuthStateChange(callback: (event: string, session: import('@supabase/supabase-js').Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
