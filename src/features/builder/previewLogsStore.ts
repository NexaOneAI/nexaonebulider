/**
 * Lightweight ring-buffer store for preview iframe debug events
 * (console.* + fetch/XHR + uncaught errors). Kept outside builderStore
 * so the DevTools panel can subscribe without re-rendering the whole
 * builder on every log line.
 */
import { create } from 'zustand';

export type PreviewLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface PreviewLogEntry {
  id: string;
  type: 'console';
  level: PreviewLogLevel;
  message: string;
  at: number;
}

export interface PreviewNetworkEntry {
  id: string;
  type: 'network';
  method: string;
  url: string;
  status?: number;
  ok?: boolean;
  durationMs?: number;
  error?: string;
  at: number;
}

export type PreviewEvent = PreviewLogEntry | PreviewNetworkEntry;

interface State {
  events: PreviewEvent[];
  push: (e: Omit<PreviewEvent, 'id' | 'at'> & { at?: number }) => void;
  clear: () => void;
  consoleCount: () => { log: number; warn: number; error: number };
  networkCount: () => { ok: number; failed: number };
}

const MAX_EVENTS = 300;

let counter = 0;
const nextId = () => `${Date.now()}-${++counter}`;

export const usePreviewLogsStore = create<State>((set, get) => ({
  events: [],
  push: (e) =>
    set((s) => {
      const entry = { ...e, id: nextId(), at: e.at ?? Date.now() } as PreviewEvent;
      const next = [...s.events, entry];
      if (next.length > MAX_EVENTS) next.splice(0, next.length - MAX_EVENTS);
      return { events: next };
    }),
  clear: () => set({ events: [] }),
  consoleCount: () => {
    const c = { log: 0, warn: 0, error: 0 };
    for (const e of get().events) {
      if (e.type !== 'console') continue;
      if (e.level === 'warn') c.warn++;
      else if (e.level === 'error') c.error++;
      else c.log++;
    }
    return c;
  },
  networkCount: () => {
    const c = { ok: 0, failed: 0 };
    for (const e of get().events) {
      if (e.type !== 'network') continue;
      if (e.error || (e.status && e.status >= 400)) c.failed++;
      else c.ok++;
    }
    return c;
  },
}));
