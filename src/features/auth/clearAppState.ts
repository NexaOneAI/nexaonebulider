/**
 * Centralized cleanup invoked on hard logout flows (e.g. after password reset).
 *
 * Responsibilities:
 *  - Revoke the Supabase session globally.
 *  - Remove any persisted Supabase tokens from localStorage.
 *  - Reset every Zustand store that holds user-scoped data.
 *  - Drop React Query cache so no stale fetches leak across users.
 *  - Clear sessionStorage seeds (e.g. seed prompts for the builder).
 */
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/app/providers';
import { useAuthStore } from './authStore';
import { useProjectsStore } from '@/features/projects/projectsStore';
import { useCreditsStore } from '@/features/credits/creditsStore';
import { useGithubStore } from '@/features/github/githubStore';

export async function clearAppState(): Promise<void> {
  // 1. Revoke server-side session in all devices. Best-effort.
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    /* ignored — local cleanup still runs */
  }

  // 2. Drop Supabase tokens persisted in localStorage.
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-') || k.includes('supabase.auth'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* localStorage may be unavailable */
  }

  // 3. Clear sessionStorage seeds (e.g. builder seedPrompt:* keys).
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('seedPrompt:') || k.startsWith('sb-'))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }

  // 4. Reset Zustand stores that cache user data.
  try {
    useAuthStore.setState({ user: null, session: null, profile: null });
    useProjectsStore.setState({ projects: [], currentProject: null, loading: false });
    useCreditsStore.setState({ transactions: [], loading: false });
    useGithubStore.getState().reset();
  } catch {
    /* ignore — stores might not be initialized in some flows */
  }

  // 5. Wipe React Query cache so no per-user data lingers.
  try {
    queryClient.clear();
  } catch {
    /* ignore */
  }
}