/**
 * WebContainerTerminal — interactive xterm.js shell bound to the WC `jsh`
 * process. Lets the user run npm/git/test commands directly inside the
 * WebContainer once the dev server is ready.
 */
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { spawnInteractiveShell } from '@/features/builder/webcontainerService';

export function WebContainerTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const term = new Terminal({
      convertEol: true,
      fontSize: 12,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      theme: {
        background: '#0a0b10',
        foreground: '#e2e8f0',
        cursor: '#3b82f6',
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;

    let proc: { input: WritableStream<string>; output: ReadableStream<string>; resize: (s: { cols: number; rows: number }) => void; kill: () => void } | null = null;

    (async () => {
      try {
        const p = await spawnInteractiveShell(term.cols, term.rows);
        proc = p as unknown as typeof proc;
        const writer = (proc as NonNullable<typeof proc>).input.getWriter();
        term.onData((data) => writer.write(data).catch(() => {}));
        const reader = (proc as NonNullable<typeof proc>).output.getReader();
        (async () => {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            term.write(value);
          }
        })();
      } catch (e) {
        term.writeln(`\x1b[31m[error] ${e instanceof Error ? e.message : String(e)}\x1b[0m`);
      }
    })();

    const onResize = () => {
      try {
        fit.fit();
        if (proc) proc.resize({ cols: term.cols, rows: term.rows });
      } catch {
        /* ignore */
      }
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      try {
        proc?.kill();
      } catch {
        /* ignore */
      }
      term.dispose();
      termRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}