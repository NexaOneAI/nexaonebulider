/**
 * Per-project chat cutoff timestamps stored in localStorage.
 *
 * When the user clicks "Nueva conversación", we record the current ISO
 * timestamp for that project. Subsequent edit requests will tell the
 * backend to ignore any `ai_messages` created before this cutoff so the
 * model gets a clean conversation slate without losing the underlying
 * version history.
 */
const KEY = 'nexa.chatCutoff.v1';
const EVT = 'nexa.chatCutoff.changed';

type CutoffMap = Record<string, string>;

function read(): CutoffMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CutoffMap) : {};
  } catch {
    return {};
  }
}

function write(map: CutoffMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* ignore quota errors */
  }
}

export function getChatCutoff(projectId: string): string | null {
  if (!projectId) return null;
  return read()[projectId] || null;
}

export function setChatCutoff(projectId: string, isoTs: string = new Date().toISOString()) {
  if (!projectId) return;
  const map = read();
  map[projectId] = isoTs;
  write(map);
}

export function clearChatCutoff(projectId: string) {
  if (!projectId) return;
  const map = read();
  if (map[projectId]) {
    delete map[projectId];
    write(map);
  }
}

export function subscribeChatCutoff(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener('storage', handler);
  };
}
