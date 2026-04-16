import { create } from 'zustand';
import { authService } from './authService';
import type { AuthState, Profile } from './types';
import type { Session } from '@supabase/supabase-js';

interface AuthActions {
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),

  initialize: async () => {
    if (get().initialized) return;

    authService.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
      if (session?.user) {
        setTimeout(async () => {
          const [profile, role] = await Promise.all([
            authService.getProfile(session.user.id),
            authService.getUserRole(session.user.id),
          ]);
          if (profile) set({ profile: { ...profile, role } });
        }, 0);
      } else {
        set({ profile: null });
      }
    });

    const session = await authService.getSession();
    set({ session, user: session?.user ?? null, loading: false, initialized: true });

    if (session?.user) {
      const [profile, role] = await Promise.all([
        authService.getProfile(session.user.id),
        authService.getUserRole(session.user.id),
      ]);
      if (profile) set({ profile: { ...profile, role } });
    }
  },

  signOut: async () => {
    await authService.signOut();
    set({ user: null, session: null, profile: null });
  },
}));
