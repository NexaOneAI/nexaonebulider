/**
 * Minimal GitHub REST API helpers using fetch. We deliberately avoid the
 * Octokit SDK to keep cold-start fast on Deno Edge Functions.
 *
 * Only the endpoints we actually use are implemented:
 *   - GET   /user                           (current user)
 *   - POST  /user/repos                     (create repo)
 *   - GET   /repos/{owner}/{repo}           (get repo + default branch)
 *   - GET   /repos/{owner}/{repo}/git/ref/heads/{branch}
 *   - POST  /repos/{owner}/{repo}/git/blobs
 *   - POST  /repos/{owner}/{repo}/git/trees
 *   - POST  /repos/{owner}/{repo}/git/commits
 *   - PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}
 */

export const GH_API = 'https://api.github.com';

export class GithubError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function gh<T = unknown>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const resp = await fetch(`${GH_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'nexa-one-builder',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!resp.ok) {
    const msg =
      (parsed as { message?: string })?.message ||
      `GitHub ${method} ${path} failed (${resp.status})`;
    throw new GithubError(resp.status, parsed, msg);
  }
  return parsed as T;
}

// ---- Endpoints ----

export interface GhUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
}

export const ghGetUser = (token: string) => gh<GhUser>(token, 'GET', '/user');

export interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch: string;
  html_url: string;
  private: boolean;
}

export const ghCreateRepo = (
  token: string,
  args: { name: string; description?: string; private?: boolean; auto_init?: boolean },
) =>
  gh<GhRepo>(token, 'POST', '/user/repos', {
    name: args.name,
    description: args.description ?? 'Generated with Nexa One Builder',
    private: args.private ?? true,
    auto_init: args.auto_init ?? true, // create initial commit so we have a ref
  });

export const ghGetRepo = (token: string, owner: string, repo: string) =>
  gh<GhRepo>(token, 'GET', `/repos/${owner}/${repo}`);

interface GhRef {
  ref: string;
  object: { sha: string; type: string };
}

export const ghGetRef = (token: string, owner: string, repo: string, branch: string) =>
  gh<GhRef>(token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${branch}`);

interface GhCommit {
  sha: string;
  tree: { sha: string };
}

export const ghGetCommit = (token: string, owner: string, repo: string, sha: string) =>
  gh<GhCommit>(token, 'GET', `/repos/${owner}/${repo}/git/commits/${sha}`);

interface GhBlob {
  sha: string;
  url: string;
}

export const ghCreateBlob = (
  token: string,
  owner: string,
  repo: string,
  content: string,
  encoding: 'utf-8' | 'base64' = 'utf-8',
) =>
  gh<GhBlob>(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, {
    content,
    encoding,
  });

interface GhTree {
  sha: string;
  url: string;
  tree: Array<{ path: string; mode: string; type: string; sha: string }>;
}

export const ghCreateTree = (
  token: string,
  owner: string,
  repo: string,
  baseTree: string | null,
  tree: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }>,
) =>
  gh<GhTree>(token, 'POST', `/repos/${owner}/${repo}/git/trees`, {
    base_tree: baseTree,
    tree,
  });

export const ghCreateCommit = (
  token: string,
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentShas: string[],
) =>
  gh<GhCommit>(token, 'POST', `/repos/${owner}/${repo}/git/commits`, {
    message,
    tree: treeSha,
    parents: parentShas,
  });

export const ghUpdateRef = (
  token: string,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
  force = false,
) =>
  gh<GhRef>(token, 'PATCH', `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    sha,
    force,
  });
