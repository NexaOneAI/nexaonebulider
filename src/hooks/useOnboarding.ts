import { useEffect, useState } from 'react';
import { onboardingService, type OnboardingState } from '@/features/onboarding/onboardingService';
import { useAuth } from './useAuth';

/**
 * Detects whether the current user should see the onboarding flow.
 * Auto-creates the row on first dashboard visit.
 */
export function useOnboarding() {
  const { user, isAuthenticated } = useAuth();
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
      const s = await onboardingService.getOrCreate(user.id);
      if (!active) return;
      setState(s);
      setLoading(false);
      if (s && !s.completed) setOpen(true);
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
      const s = await onboardingService.getOrCreate(user.id);
      setState(s);
    },
    /** Manually re-open onboarding (e.g. from "Help" menu). */
    reopen: () => setOpen(true),
  };
}