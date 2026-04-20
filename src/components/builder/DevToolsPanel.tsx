import { useState, useMemo } from 'react';
import { Terminal, Activity, Trash2, X, Filter, Boxes, AlertOctagon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreviewLogsStore, type PreviewEvent } from '@/features/builder/previewLogsStore';
import { usePreviewErrorsStore } from '@/features/builder/previewErrorsStore';
import { useBuilderStore } from '@/features/builder/builderStore';
import { SandpackTerminal } from './SandpackTerminal';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'console' | 'network' | 'terminal' | 'errors';

export function DevToolsPanel({ open, onClose }: Props) {
  const events = usePreviewLogsStore((s) => s.events);
  const clear = usePreviewLogsStore((s) => s.clear);
  const errors = usePreviewErrorsStore((s) => s.errors);
  const removeError = usePreviewErrorsStore((s) => s.remove);
  const clearErrors = usePreviewErrorsStore((s) => s.clear);
  const fixWithAI = useBuilderStore((s) => s.fixWithAI);
  const loading = useBuilderStore((s) => s.loading);
  const [tab, setTab] = useState<Tab>(errors.length > 0 ? 'errors' : 'console');
  const [filter, setFilter] = useState('');

  const consoleEvents = useMemo(
    () => events.filter((e): e is Extract<PreviewEvent, { type: 'console' }> => e.type === 'console'),
    [events],
  );
  const networkEvents = useMemo(
    () => events.filter((e): e is Extract<PreviewEvent, { type: 'network' }> => e.type === 'network'),
    [events],
  );

  const counts = useMemo(() => {
    const c = { log: 0, warn: 0, error: 0, netOk: 0, netFail: 0 };
    for (const e of events) {
      if (e.type === 'console') {
        if (e.level === 'warn') c.warn++;
        else if (e.level === 'error') c.error++;
        else c.log++;
      } else {
        if (e.error || (e.status && e.status >= 400)) c.netFail++;
        else c.netOk++;
      }
    }
    return c;
  }, [events]);

  if (!open) return null;

  const filtered =
    tab === 'terminal'
      ? []
      : (tab === 'console' ? consoleEvents : networkEvents).filter((e) => {
          if (!filter) return true;
          const f = filter.toLowerCase();
          if (e.type === 'console') return e.message.toLowerCase().includes(f);
          return `${e.method} ${e.url} ${e.status ?? ''}`.toLowerCase().includes(f);
        });

  return (
    <div className="flex h-64 flex-col border-t border-border/50 bg-card/80 backdrop-blur">
      <div className="flex items-center gap-1 border-b border-border/50 px-2 py-1.5">
        <button
          onClick={() => setTab('console')}
          className={cn(
            'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
            tab === 'console'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted/50',
          )}
        >
          <Terminal className="h-3 w-3" />
          Console
          {counts.error > 0 && (
            <span className="rounded bg-destructive/20 px-1 text-[10px] text-destructive">
              {counts.error}
            </span>
          )}
          {counts.warn > 0 && (
            <span className="rounded bg-amber-500/20 px-1 text-[10px] text-amber-500">
              {counts.warn}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('network')}
          className={cn(
            'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
            tab === 'network'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted/50',
          )}
        >
          <Activity className="h-3 w-3" />
          Network
          {counts.netFail > 0 && (
            <span className="rounded bg-destructive/20 px-1 text-[10px] text-destructive">
              {counts.netFail}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{counts.netOk + counts.netFail}</span>
        </button>
        <button
          onClick={() => setTab('terminal')}
          className={cn(
            'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
            tab === 'terminal'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted/50',
          )}
          title="Logs de Sandpack (cuando esté activo)"
        >
          <Boxes className="h-3 w-3" />
          Terminal
        </button>
        <button
          onClick={() => setTab('errors')}
          className={cn(
            'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
            tab === 'errors'
              ? 'bg-destructive/15 text-destructive'
              : 'text-muted-foreground hover:bg-muted/50',
          )}
          title="Errores de runtime con auto-fix por IA"
        >
          <AlertOctagon className="h-3 w-3" />
          Errors
          {errors.length > 0 && (
            <span className="rounded bg-destructive/20 px-1 text-[10px] text-destructive">
              {errors.length}
            </span>
          )}
        </button>

        <div className="ml-2 flex flex-1 items-center gap-1">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar…"
            className="h-6 flex-1 max-w-[200px] rounded bg-background px-2 text-xs outline-none ring-1 ring-border/50 focus:ring-primary/50"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => (tab === 'errors' ? clearErrors() : clear())}
          title="Limpiar"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Cerrar">
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto font-mono text-[11px]">
        {tab === 'terminal' ? (
          <SandpackTerminal />
        ) : tab === 'errors' ? (
          errors.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <span className="text-base">✨</span>
              <span>Sin errores de runtime. El preview está limpio.</span>
            </div>
          ) : (
            <ul className="divide-y divide-border/20">
              {[...errors].reverse().map((err) => (
                <li key={err.id} className="space-y-1.5 bg-destructive/5 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <pre className="whitespace-pre-wrap break-all text-[11px] text-destructive">
                        {err.message}
                      </pre>
                      {err.inferredFile && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          📄 {err.inferredFile}
                          {err.inferredLine ? `:${err.inferredLine}` : ''}
                          {err.occurrences.length > 1 && ` · ×${err.occurrences.length}`}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        className="h-6 gap-1 px-2 text-[10px]"
                        onClick={() => fixWithAI(err.id)}
                        disabled={loading}
                        title="Envía el error + archivo culpable a la IA"
                      >
                        <Sparkles className="h-3 w-3" />
                        Fix con IA
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => removeError(err.id)}
                        title="Descartar"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {err.stack && (
                    <details className="text-[10px] text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">stack trace</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all opacity-70">
                        {err.stack.split('\n').slice(0, 8).join('\n')}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {tab === 'console'
              ? 'Sin logs. Los console.log del preview aparecerán aquí.'
              : 'Sin requests. Las llamadas fetch/XHR del preview aparecerán aquí.'}
          </div>
        ) : tab === 'console' ? (
          <ul className="divide-y divide-border/20">
            {filtered.map((e) => {
              const ev = e as Extract<PreviewEvent, { type: 'console' }>;
              return (
                <li
                  key={ev.id}
                  className={cn(
                    'flex items-start gap-2 px-3 py-1',
                    ev.level === 'error' && 'bg-destructive/10 text-destructive',
                    ev.level === 'warn' && 'bg-amber-500/10 text-amber-500',
                  )}
                >
                  <span className="mt-0.5 w-12 shrink-0 text-[10px] uppercase opacity-60">
                    {ev.level}
                  </span>
                  <pre className="flex-1 whitespace-pre-wrap break-all">{ev.message}</pre>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="divide-y divide-border/20">
            {filtered.map((e) => {
              const ev = e as Extract<PreviewEvent, { type: 'network' }>;
              const isFail = !!ev.error || (ev.status != null && ev.status >= 400);
              return (
                <li
                  key={ev.id}
                  className={cn(
                    'flex items-start gap-2 px-3 py-1',
                    isFail && 'bg-destructive/10 text-destructive',
                  )}
                >
                  <span className="w-12 shrink-0 font-semibold opacity-80">{ev.method}</span>
                  <span
                    className={cn(
                      'w-12 shrink-0 text-center',
                      isFail ? 'text-destructive' : 'text-emerald-500',
                    )}
                  >
                    {ev.status ?? (ev.error ? 'ERR' : '…')}
                  </span>
                  <span className="flex-1 break-all">{ev.url}</span>
                  {ev.durationMs != null && (
                    <span className="shrink-0 text-muted-foreground">{ev.durationMs}ms</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
