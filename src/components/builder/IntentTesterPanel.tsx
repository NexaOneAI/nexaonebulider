import { useState } from 'react';
import {
  Wand2,
  Play,
  Undo2,
  Loader2,
  Sparkles,
  ShieldAlert,
  Coins,
  FileEdit,
  Layers,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBuilderStore } from '@/features/builder/builderStore';
import {
  analyzeProject,
  RISK_LABELS,
  type IntentSnapshot,
} from '@/features/builder/intent/intentEngine';
import { activatePwaForCurrentProject } from '@/features/builder/store/pwaAction';
import { versionsService } from '@/features/projects/versionsService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNexaMemory } from '@/hooks/useNexaMemory';
import { Brain, History } from 'lucide-react';

/**
 * Banco de pruebas visible del motor de intención. Vive como tarjeta dentro
 * del Builder para que el usuario pueda ejecutar el motor sobre el proyecto
 * REAL que tiene abierto (no un demo) y ver paso a paso:
 *   1. Botón "Analizar proyecto" → corre analyzeProject() y vuelca el snapshot.
 *   2. Resultado renderizado: tipo, intención, módulo, riesgo, créditos, archivos.
 *   3. Botón "Aplicar módulo recomendado" → dispara sendPrompt(plan.prompt).
 *   4. Botón "Revertir último cambio" → loadVersion(versions[1]).
 */
export function IntentTesterPanel() {
  const files = useBuilderStore((s) => s.files);
  const projectName = useBuilderStore((s) => s.projectName);
  const projectId = useBuilderStore((s) => s.projectId);
  const messages = useBuilderStore((s) => s.messages);
  const loading = useBuilderStore((s) => s.loading);
  const streaming = useBuilderStore((s) => s.streaming);
  const sendPrompt = useBuilderStore((s) => s.sendPrompt);
  const loadVersion = useBuilderStore((s) => s.loadVersion);
  const chatOpen = useBuilderStore((s) => s.chatOpen);
  const toggleChat = useBuilderStore((s) => s.toggleChat);

  const [snap, setSnap] = useState<IntentSnapshot | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reverting, setReverting] = useState(false);

  const {
    memory,
    acceptedIds,
    registerAccepted,
    registerModule,
    registerRevert,
    syncContext,
  } = useNexaMemory(projectId);

  const busy = loading || streaming;

  const lastUserPrompt = (() => {
    const safe = Array.isArray(messages) ? messages : [];
    for (let i = safe.length - 1; i >= 0; i -= 1) {
      const m = safe[i];
      if (m && m.role === 'user' && typeof m.content === 'string') return m.content;
    }
    return '';
  })();

  const handleAnalyze = () => {
    if (!projectId) {
      toast.info('Abre un proyecto primero');
      return;
    }
    setAnalyzing(true);
    try {
      const result = analyzeProject({ projectName, files, lastUserPrompt, acceptedIds });
      setSnap(result);
      syncContext({ kind: result.kind, level: result.level }).catch(() => {});
      if (!result.primary) {
        toast.info('El proyecto está vacío — genera o abre archivos primero');
      } else {
        toast.success(`Análisis completo: ${result.kindLabel} · nivel ${result.levelLabel}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al analizar');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async () => {
    if (!snap?.primary) {
      toast.info('Primero pulsa "Analizar proyecto"');
      return;
    }
    if (busy) {
      toast.info('La IA está ocupada, espera a que termine');
      return;
    }
    const plan = snap.primary;
    if (plan.action.uiAction === 'activate-pwa') {
      try {
        await activatePwaForCurrentProject();
        toast.success('PWA activada');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error activando PWA');
      }
      return;
    }
    if (!chatOpen) toggleChat();
    toast.success(`Aplicando: ${plan.intent}`);
    try {
      await sendPrompt(plan.prompt);
      await registerAccepted({ id: plan.action.id, label: plan.intent });
      await registerModule({
        id: plan.module,
        label: plan.intent,
        credits: plan.estimatedCredits,
        actionId: plan.action.id,
      });
      // Re-analizar tras aplicar para ver el nuevo nivel/sugerencia.
      setTimeout(() => handleAnalyze(), 500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al implementar');
    }
  };

  const handleRevert = async () => {
    if (!projectId || reverting) return;
    if (!confirm('¿Revertir al estado anterior? Se descartará el último cambio.')) return;
    setReverting(true);
    try {
      const versions = await versionsService.list(projectId);
      if (versions.length < 2) {
        toast.info('No hay versión anterior a la que revertir');
        return;
      }
      const target = versions[1];
      await loadVersion(target.id);
      toast.success(`Revertido a v${target.version_number}`);
      await registerRevert(`Revertido a v${target.version_number}`);
      setSnap(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al revertir');
    } finally {
      setReverting(false);
    }
  };

  const riskTone = {
    low: 'text-primary border-primary/40 bg-primary/10',
    medium: 'text-accent border-accent/40 bg-accent/10',
    high: 'text-destructive border-destructive/40 bg-destructive/10',
  } as const;

  return (
    <div
      data-testid="intent-tester"
      className="m-3 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-4 shadow-lg"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/40">
          <Wand2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">Banco de pruebas — Motor IA Nexa</h3>
          <p className="text-[11px] text-muted-foreground">
            Ejecuta el motor de intención sobre el proyecto abierto y aplica el módulo
            recomendado en tiempo real.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={analyzing}
          className="gap-1.5"
          data-testid="btn-analyze"
        >
          {analyzing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Analizar proyecto
        </Button>
      </div>

      {snap && snap.primary && (
        <div className="mt-3 space-y-3 rounded-md border border-border/60 bg-background/60 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field
              icon={<Layers className="h-3.5 w-3.5 text-primary" />}
              label="Tipo detectado"
              value={snap.kindLabel}
              testid="result-kind"
            />
            <Field
              icon={<Target className="h-3.5 w-3.5 text-accent" />}
              label="Nivel del proyecto"
              value={snap.levelLabel}
              testid="result-level"
            />
            <Field
              icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
              label="Intención detectada"
              value={snap.primary.intent}
              testid="result-intent"
            />
            <Field
              icon={<Wand2 className="h-3.5 w-3.5 text-accent" />}
              label="Módulo recomendado"
              value={snap.primary.module}
              testid="result-module"
            />
            <Field
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
              label="Riesgo"
              value={RISK_LABELS[snap.primary.risk]}
              valueClassName={cn('rounded border px-2 py-0.5 text-[10px] font-bold', riskTone[snap.primary.risk])}
              testid="result-risk"
            />
            <Field
              icon={<Coins className="h-3.5 w-3.5 text-primary" />}
              label="Créditos estimados"
              value={snap.primary.estimatedCredits === 0 ? 'Gratis' : `~${snap.primary.estimatedCredits}`}
              testid="result-credits"
            />
          </div>

          <div data-testid="result-files">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileEdit className="h-3 w-3" />
              Archivos que tocará
            </div>
            {snap.primary.filesAffected.length === 0 ? (
              <span className="text-[11px] italic text-muted-foreground">
                Se determinará en tiempo real durante el streaming
              </span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {snap.primary.filesAffected.map((f) => (
                  <code
                    key={f}
                    className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    {f}
                  </code>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-1.5 rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span>
              <span className="font-semibold text-foreground">Resultado esperado:</span>{' '}
              {snap.primary.expectedOutcome}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleApply}
              disabled={busy}
              className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
              data-testid="btn-apply"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Aplicar módulo recomendado
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRevert}
              disabled={reverting || busy}
              className="gap-1.5"
              data-testid="btn-revert"
            >
              {reverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
              Revertir último cambio
            </Button>
          </div>
        </div>
      )}

      {snap && !snap.primary && (
        <div className="mt-3 rounded-md border border-border/60 bg-background/60 p-3 text-[12px] text-muted-foreground">
          El proyecto está vacío. Genera código primero o abre un proyecto existente.
        </div>
      )}
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  valueClassName,
  testid,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  testid?: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded border border-border/40 bg-card/40 px-2 py-1.5">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          data-testid={testid}
          className={cn('truncate text-[12px] font-semibold text-foreground', valueClassName)}
          title={value}
        >
          {value}
        </div>
      </div>
    </div>
  );
}