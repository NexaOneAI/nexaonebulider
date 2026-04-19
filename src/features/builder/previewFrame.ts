/**
 * Preview frame preference: realistic device chrome around the iframe.
 * Persisted per project in localStorage. Falls back to 'none' so the
 * preview keeps its current bare look until the user picks a frame.
 */

export type PreviewFrame = 'none' | 'iphone' | 'ipad' | 'macos';

const KEY_PREFIX = 'lovable.previewFrame:';

export const PREVIEW_FRAMES: { id: PreviewFrame; label: string }[] = [
  { id: 'none', label: 'Sin marco' },
  { id: 'iphone', label: 'iPhone 15' },
  { id: 'ipad', label: 'iPad' },
  { id: 'macos', label: 'macOS' },
];

export function getPreviewFrame(projectId: string | undefined): PreviewFrame {
  if (!projectId || typeof window === 'undefined') return 'none';
  try {
    const v = window.localStorage.getItem(KEY_PREFIX + projectId);
    if (v === 'iphone' || v === 'ipad' || v === 'macos' || v === 'none') return v;
  } catch {}
  return 'none';
}

export function setPreviewFrame(projectId: string, frame: PreviewFrame): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY_PREFIX + projectId, frame);
    window.dispatchEvent(new CustomEvent('lovable:preview-frame-changed', { detail: { projectId, frame } }));
  } catch {}
}

export function subscribePreviewFrame(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener('lovable:preview-frame-changed', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('lovable:preview-frame-changed', handler);
    window.removeEventListener('storage', handler);
  };
}
