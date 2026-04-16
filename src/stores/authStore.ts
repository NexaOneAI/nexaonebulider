import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles' as never)
      .select('*')
      .eq('id' as never, userId as never)
      .single();
    if (error || !data) return null;
    return data as unknown as Profile;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    if (get().initialized) return;

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
      if (session?.user) {
        setTimeout(async () => {
          const profile = await fetchProfile(session.user.id);
          if (profile) set({ profile });
        }, 0);
      } else {
        set({ profile: null });
      }
    });

    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, loading: false, initialized: true });

    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      if (profile) set({ profile });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },
}));
