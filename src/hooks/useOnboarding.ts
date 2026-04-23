import { useEffect, useState } from 'react';
import { onboardingService, type OnboardingState } from '@/features/onboarding/onboardingService';
import { useAuth } from './useAuth';

/**
 * Detects whether the current user should see the onboarding flow.
 * Auto-creates the row on first dashboard visit.
 */
export function useOnboarding() {
  const auth = useAuth();
  const user = auth?.user ?? null;
  const isAuthenticated = !!auth?.isAuthenticated;
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const s = await onboardingService.getOrCreate(user.id);
        if (!active) return;
        setState(s ?? null);
        if (s && !s.completed) setOpen(true);
      } catch (err) {
        console.warn('[useOnboarding] getOrCreate failed:', err);
        if (active) setState(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, isAuthenticated]);

  return {
    state,
    loading,
    open,
    setOpen,
    refresh: async () => {
      if (!user?.id) return;
      try {
        const s = await onboardingService.getOrCreate(user.id);
        setState(s ?? null);
      } catch (err) {
        console.warn('[useOnboarding] refresh failed:', err);
      }
    },
    /** Manually re-open onboarding (e.g. from "Help" menu). */
    reopen: () => setOpen(true),
  };
}