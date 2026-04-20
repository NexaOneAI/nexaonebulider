/**
 * Client-side service for GitHub sync. Wraps the `github-sync`,
 * `github-oauth-start` edge functions and exposes a typed API.
 */
import { supabase } from '@/integrations/supabase/client';

export interface GithubStatus {
  connected: boolean;
  github_login: string | null;
  avatar_url: string | null;
  scope: string | null;
  repo: GithubRepoLink | null;
}

export interface GithubRepoLink {
  id: string;
  project_id: string;
  user_id: string;
  owner: string;
  repo: string;
  branch: string;
  repo_id: number | null;
  html_url: string | null;
  is_private: boolean;
  auto_push: boolean;
  last_pushed_sha: string | null;
  last_pushed_at: string | null;
  last_pushed_version_id: string | null;
  last_push_error: string | null;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

async function invoke<T = unknown>(
  fn: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message || `${fn} error`);
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

export const githubService = {
  async startOAuth(returnUrl: string): Promise<{ url: string }> {
    return invoke('github-oauth-start', { return_url: returnUrl });
  },

  async status(projectId?: string): Promise<GithubStatus> {
    return invoke('github-sync', { action: 'status', projectId });
  },

  async disconnect(): Promise<{ ok: boolean }> {
    return invoke('github-sync', { action: 'disconnect' });
  },

  async createRepo(args: {
    projectId: string;
    name: string;
    private?: boolean;
    files: GeneratedFile[];
  }): Promise<{ ok: boolean; repo: GithubRepoLink; commit_sha: string }> {
    return invoke('github-sync', { action: 'create_repo', ...args });
  },

  async linkRepo(args: {
    projectId: string;
    owner: string;
    repo: string;
    branch?: string;
    files: GeneratedFile[];
  }): Promise<{ ok: boolean; repo: GithubRepoLink; commit_sha: string | null }> {
    return invoke('github-sync', { action: 'link_repo', ...args });
  },

  async push(args: {
    projectId: string;
    files: GeneratedFile[];
    message?: string;
    versionId?: string;
  }): Promise<{ ok: boolean; commit_sha: string; html_url: string | null }> {
    return invoke('github-sync', { action: 'push', ...args });
  },

  async setAutoPush(projectId: string, autoPush: boolean): Promise<{ ok: boolean }> {
    return invoke('github-sync', {
      action: 'set_auto_push',
      projectId,
      auto_push: autoPush,
    });
  },

  async unlink(projectId: string): Promise<{ ok: boolean }> {
    return invoke('github-sync', { action: 'unlink', projectId });
  },
};

/**
 * Open the GitHub OAuth flow in a popup. Resolves when the popup signals
 * back via postMessage (or closes itself).
 */
export async function openGithubOAuthPopup(returnUrl: string): Promise<'ok' | 'error' | 'closed'> {
  const { url } = await githubService.startOAuth(returnUrl);
  return new Promise((resolve) => {
    const popup = window.open(url, 'github-oauth', 'width=720,height=720');
    if (!popup) {
      resolve('error');
      return;
    }

    const onMessage = (e: MessageEvent) => {
      if (
        e.data &&
        typeof e.data === 'object' &&
        e.data.type === 'nexa-github-oauth' &&
        (e.data.status === 'ok' || e.data.status === 'error')
      ) {
        cleanup();
        resolve(e.data.status);
      }
    };

    const interval = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        resolve('closed');
      }
    }, 500);

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(interval);
      try {
        if (!popup.closed) popup.close();
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('message', onMessage);
  });
}
