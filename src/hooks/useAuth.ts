import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/authStore';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    store.initialize();
  }, []);

  return {
    user: store.user,
    session: store.session,
    profile: store.profile,
    loading: store.loading,
    initialized: store.initialized,
    signOut: store.signOut,
    refreshProfile: store.refreshProfile,
    isAdmin: store.profile?.role === 'admin',
    isAuthenticated: !!store.session,
  };
}
