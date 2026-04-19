/**
 * User preference for the chat-edit streaming strategy.
 *
 *  - 'progressive' (A, default): SEARCH/REPLACE blocks are applied to the
 *    preview client-side as they arrive from the SSE stream. The server
 *    response still reconciles authoritatively at the end.
 *  - 'tokens-only' (B): only stream tokens for the chat indicator; the
 *    file map and preview are updated in a single shot when the server
 *    emits its final `done` event. Less moving parts, simpler mental
 *    model, but no live diff feedback.
 *
 * Persisted in localStorage so the choice survives reloads.
 */

export type StreamEditStrategy = 'progressive' | 'tokens-only';

const KEY = 'nexa.streamEditStrategy';
const DEFAULT: StreamEditStrategy = 'progressive';

export function getStreamEditStrategy(): StreamEditStrategy {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'tokens-only' || v === 'progressive' ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setStreamEditStrategy(v: StreamEditStrategy): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, v);
    window.dispatchEvent(new CustomEvent('nexa:streamEditStrategy', { detail: v }));
  } catch {
    /* noop */
  }
}

/** Subscribe to changes from anywhere (other tabs included via storage event). */
export function subscribeStreamEditStrategy(
  cb: (v: StreamEditStrategy) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const onCustom = (e: Event) => cb((e as CustomEvent<StreamEditStrategy>).detail);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb(getStreamEditStrategy());
  };
  window.addEventListener('nexa:streamEditStrategy', onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('nexa:streamEditStrategy', onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
