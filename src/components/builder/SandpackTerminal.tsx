/**
 * Terminal-style panel for the Sandpack engine. Streams bundler status
 * and build messages so the user can see what the sandbox is doing
 * (transpiling, installing deps, ready, etc.).
 *
 * This component is meant to live inside DevToolsPanel as its own tab.
 * Standalone — does not depend on useSandpack so it can render even
 * when the sandbox is not currently mounted (shows the static log buffer).
 */
import { useEffect, useState } from 'react';

export interface TerminalLine {
  id: string;
  ts: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

const MAX_LINES = 200;
const buffer: TerminalLine[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function pushTerminalLine(level: TerminalLine['level'], message: string) {
  buffer.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    level,
    message,
  });
  if (buffer.length > MAX_LINES) buffer.splice(0, buffer.length - MAX_LINES);
  notify();
}

export function clearTerminal() {
  buffer.length = 0;
  notify();
}

export function useTerminalLines(): TerminalLine[] {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((x) => x + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return buffer;
}

export function SandpackTerminal() {
  const lines = useTerminalLines();

  if (lines.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Sandpack está inactivo. Activa el toggle "Sandpack" en el header para verlo.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/20">
      {lines.map((l) => (
        <li
          key={l.id}
          className={
            'flex items-start gap-2 px-3 py-1 ' +
            (l.level === 'error'
              ? 'bg-destructive/10 text-destructive'
              : l.level === 'warn'
                ? 'bg-amber-500/10 text-amber-500'
                : l.level === 'success'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : '')
          }
        >
          <span className="mt-0.5 w-12 shrink-0 text-[10px] uppercase opacity-60">
            {l.level}
          </span>
          <pre className="flex-1 whitespace-pre-wrap break-all">{l.message}</pre>
        </li>
      ))}
    </ul>
  );
}
