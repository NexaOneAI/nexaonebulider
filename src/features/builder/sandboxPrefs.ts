/**
 * Sandbox preference per project. Decides which preview engine to use:
 * - 'iframe'   → legacy iframe + Sucrase + esm.sh (fast, lightweight)
 * - 'sandpack' → CodeSandbox Sandpack (HMR, URL bar, real router support)
 *
 * Persisted in localStorage so the toggle survives reloads, scoped per
 * project so users can experiment safely without affecting other projects.
 */

export type SandboxKind = 'iframe' | 'sandpack';

const KEY_PREFIX = 'lovable.sandbox:';
const DEFAULT: SandboxKind = 'iframe';

export const SANDBOX_OPTIONS: { id: SandboxKind; label: string; hint: string }[] = [
  { id: 'iframe', label: 'iframe (rápido)', hint: 'Sucrase + esm.sh, ligero' },
  { id: 'sandpack', label: 'Sandpack (HMR)', hint: 'Hot reload, router, terminal' },
];

export function getSandbox(projectId: string | undefined): SandboxKind {
  if (!projectId || typeof window === 'undefined') return DEFAULT;
  try {
    const v = window.localStorage.getItem(KEY_PREFIX + projectId);
    if (v === 'iframe' || v === 'sandpack') return v;
  } catch {}
  return DEFAULT;
}

export function setSandbox(projectId: string, kind: SandboxKind): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY_PREFIX + projectId, kind);
    window.dispatchEvent(
      new CustomEvent('lovable:sandbox-changed', { detail: { projectId, kind } }),
    );
  } catch {}
}

export function subscribeSandbox(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener('lovable:sandbox-changed', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('lovable:sandbox-changed', handler);
    window.removeEventListener('storage', handler);
  };
}
