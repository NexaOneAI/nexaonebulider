/**
 * Sandbox preference per project. Decides which preview engine to use:
 * - 'iframe'       → legacy iframe + Sucrase + esm.sh (fast, lightweight)
 * - 'sandpack'     → CodeSandbox Sandpack (HMR, URL bar, real router support)
 * - 'webcontainer' → StackBlitz WebContainers (real Node.js + npm + Vite in browser)
 *
 * Persisted in localStorage so the toggle survives reloads, scoped per
 * project so users can experiment safely without affecting other projects.
 *
 * 'webcontainer' is gated by:
 *   1. Per-user flag `profiles.webcontainers_enabled` (toggled by admin)
 *   2. Cross-origin isolation (COOP/COEP headers) → `crossOriginIsolated`
 *   3. SharedArrayBuffer availability
 */

export type SandboxKind = 'iframe' | 'sandpack' | 'webcontainer';

const KEY_PREFIX = 'lovable.sandbox:';
const DEFAULT: SandboxKind = 'iframe';

export const SANDBOX_OPTIONS: { id: SandboxKind; label: string; hint: string }[] = [
  { id: 'iframe', label: 'iframe (rápido)', hint: 'Sucrase + esm.sh, ligero' },
  { id: 'sandpack', label: 'Sandpack (HMR)', hint: 'Hot reload, router, terminal' },
  { id: 'webcontainer', label: 'WebContainer (Node real)', hint: 'npm install + Vite real en el browser' },
];

export function getSandbox(projectId: string | undefined): SandboxKind {
  if (!projectId || typeof window === 'undefined') return DEFAULT;
  try {
    const v = window.localStorage.getItem(KEY_PREFIX + projectId);
    if (v === 'iframe' || v === 'sandpack' || v === 'webcontainer') return v;
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

/**
 * Returns true when the current page is cross-origin isolated AND
 * SharedArrayBuffer is available — the two preconditions WebContainers
 * need to boot. Without this, `webcontainer` mode is silently disabled
 * even if the user has the feature flag on.
 */
export function isWebContainersAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      Boolean((window as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated) &&
      typeof SharedArrayBuffer !== 'undefined'
    );
  } catch {
    return false;
  }
}
