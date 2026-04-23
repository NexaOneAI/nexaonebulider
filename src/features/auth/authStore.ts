import { create } from 'zustand';
import { authService } from './authService';
import type { AuthState, Profile } from './types';
import type { Session } from '@supabase/supabase-js';

interface AuthActions {
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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

    // CRITICAL: initialize() must ALWAYS finish setting initialized=true,
    // otherwise the app freezes on the "Cargando Nexa One..." loader.
    try {
      authService.onAuthStateChange(async (_event, session) => {
        set({ session, user: session?.user ?? null, loading: false });
        if (session?.user) {
          setTimeout(async () => {
            try {
              const [profile, role] = await Promise.all([
                authService.getProfile(session.user.id),
                authService.getUserRole(session.user.id),
              ]);
              if (profile) set({ profile: { ...profile, role } });
            } catch (err) {
              console.error('[authStore] profile fetch failed:', err);
            }
          }, 0);
        } else {
          set({ profile: null });
        }
      });
    } catch (err) {
      console.error('[authStore] onAuthStateChange failed:', err);
    }

    let session: Session | null = null;
    try {
      session = await authService.getSession();
    } catch (err) {
      console.error('[authStore] getSession failed:', err);
    }
    set({ session, user: session?.user ?? null, loading: false, initialized: true });

    if (session?.user) {
      try {
        const [profile, role] = await Promise.all([
          authService.getProfile(session.user.id),
          authService.getUserRole(session.user.id),
        ]);
        if (profile) set({ profile: { ...profile, role } });
      } catch (err) {
        console.error('[authStore] initial profile fetch failed:', err);
      }
    }
  },

  signOut: async () => {
    await authService.signOut();
    set({ user: null, session: null, profile: null });
  },

  refreshProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    const [profile, role] = await Promise.all([
      authService.getProfile(userId),
      authService.getUserRole(userId),
    ]);
    if (profile) set({ profile: { ...profile, role } });
  },
}));
