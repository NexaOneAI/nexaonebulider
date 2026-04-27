/**
 * Panel UI — historial de eventos IA (`nexa_logs`).
 *
 * Lee desde la memoria del proyecto y permite filtrar por éxito/error.
 * No duplica lógica: el formato viene del logger central.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ScrollText,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { listEventosIA } from '@/features/audit/nexaEventLogger';
import type { NexaLogEvento } from '@/features/knowledge/nexaMemoryService';

type FiltroResultado = 'todos' | 'success' | 'fail';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

const TIPO_LABEL: Record<NexaLogEvento['tipo'], string> = {
  plan_aplicado: 'Plan aplicado',
  analisis: 'Análisis',
  error: 'Error',
};

const TIPO_TONE: Record<NexaLogEvento['tipo'], string> = {
  plan_aplicado: 'border-primary/40 bg-primary/10 text-primary',
  analisis: 'border-accent/40 bg-accent/10 text-accent',
  error: 'border-destructive/40 bg-destructive/10 text-destructive',
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function NexaEventLogPanel({ open, onClose, projectId }: Props) {
  const [logs, setLogs] = useState<NexaLogEvento[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<FiltroResultado>('todos');

  // Render-cap: solo guardamos los últimos 100 eventos para que el panel
  // nunca renderice listas gigantes (anti-OOM).
  const MAX_LOGS = 100;

  const refresh = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await listEventosIA(projectId);
      const recent = data.slice(-MAX_LOGS).reverse(); // más reciente primero
      setLogs(recent);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const filtered = useMemo(() => {
    if (filtro === 'todos') return logs;
    return logs.filter((l) => l.resultado === filtro);
  }, [logs, filtro]);

  const counts = useMemo(() => {
    const ok = logs.filter((l) => l.resultado === 'success').length;
    const fail = logs.filter((l) => l.resultado === 'fail').length;
    return { ok, fail, total: logs.length };
  }, [logs]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            Historial de eventos IA
          </DialogTitle>
          <DialogDescription>
            Trazabilidad completa de planes aplicados, análisis y errores —
            base para mejora continua.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={filtro === 'todos' ? 'default' : 'outline'}
            onClick={() => setFiltro('todos')}
            className="h-7 gap-1.5 text-xs"
          >
            <Activity className="h-3 w-3" />
            Todos ({counts.total})
          </Button>
          <Button
            size="sm"
            variant={filtro === 'success' ? 'default' : 'outline'}
            onClick={() => setFiltro('success')}
            className="h-7 gap-1.5 text-xs"
          >
            <CheckCircle2 className="h-3 w-3" />
            Éxito ({counts.ok})
          </Button>
          <Button
            size="sm"
            variant={filtro === 'fail' ? 'default' : 'outline'}
            onClick={() => setFiltro('fail')}
            className="h-7 gap-1.5 text-xs"
          >
            <XCircle className="h-3 w-3" />
            Errores ({counts.fail})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            disabled={loading}
            className="ml-auto h-7 gap-1.5 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Recargar
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-md border border-border bg-card/40">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando eventos…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {logs.length === 0
                ? 'Sin eventos todavía. Aplica o analiza un plan para empezar.'
                : 'No hay eventos con ese filtro.'}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((ev, idx) => (
                <li key={`${ev.timestamp}-${idx}`} className="px-3 py-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        TIPO_TONE[ev.tipo],
                      )}
                    >
                      {ev.tipo === 'plan_aplicado' && <Sparkles className="h-3 w-3" />}
                      {ev.tipo === 'analisis' && <Activity className="h-3 w-3" />}
                      {ev.tipo === 'error' && <AlertTriangle className="h-3 w-3" />}
                      {TIPO_LABEL[ev.tipo]}
                    </span>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold',
                        ev.resultado === 'success'
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-destructive/40 bg-destructive/10 text-destructive',
                      )}
                    >
                      {ev.resultado === 'success' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {ev.resultado === 'success' ? 'OK' : 'FAIL'}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                      {formatTime(ev.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
                    {ev.accion}
                  </p>
                  {ev.archivos.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ev.archivos.slice(0, 4).map((a) => (
                        <code
                          key={a}
                          className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                        >
                          {a}
                        </code>
                      ))}
                      {ev.archivos.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{ev.archivos.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{ev.duracion_ms} ms</span>
                    {ev.meta?.module && (
                      <span>· módulo: {String(ev.meta.module)}</span>
                    )}
                    {ev.meta?.estimatedCredits !== undefined && (
                      <span>· ~{String(ev.meta.estimatedCredits)} créditos</span>
                    )}
                    {ev.meta?.error && (
                      <span className="truncate text-destructive">
                        · {String(ev.meta.error)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
