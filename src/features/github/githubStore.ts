/**
 * Tiny zustand store that caches the GitHub status per project so the
 * header badge and the dialog stay in sync without re-fetching on every
 * render. Refreshed manually after connect/create/link/disconnect.
 */
import { create } from 'zustand';
import { githubService, type GithubStatus } from './githubService';

interface State {
  /** Per-project cache (key = projectId, '_global' for connection-only) */
  byProject: Record<string, GithubStatus>;
  loading: boolean;
  /** True while a push is in progress for the given project */
  pushing: Record<string, boolean>;

  refresh: (projectId?: string) => Promise<GithubStatus>;
  setPushing: (projectId: string, v: boolean) => void;
  reset: () => void;
}

export const useGithubStore = create<State>((set, get) => ({
  byProject: {},
  loading: false,
  pushing: {},

  refresh: async (projectId) => {
    set({ loading: true });
    try {
      const status = await githubService.status(projectId);
      const key = projectId || '_global';
      set((s) => ({ byProject: { ...s.byProject, [key]: status } }));
      return status;
    } finally {
      set({ loading: false });
    }
  },

  setPushing: (projectId, v) =>
    set((s) => ({ pushing: { ...s.pushing, [projectId]: v } })),

  reset: () => set({ byProject: {}, pushing: {} }),
}));
