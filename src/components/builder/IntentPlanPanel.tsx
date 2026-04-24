import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  Coins,
  FileEdit,
  CheckCircle2,
  Undo2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Wand2,
  AlertTriangle,
  GitCompare,
  FilePlus2,
  FileCog,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBuilderStore } from '@/features/builder/builderStore';
import {
  analyzeProject,
  RISK_LABELS,
  type IntentPlan,
  type IntentSnapshot,
} from '@/features/builder/intent/intentEngine';
import { activatePwaForCurrentProject } from '@/features/builder/store/pwaAction';
import { versionsService } from '@/features/projects/versionsService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNexaMemory } from '@/hooks/useNexaMemory';

/**
 * Panel "Próximo paso recomendado" — el copiloto inteligente de Nexa One.
 *
 * Lee el snapshot de intentEngine (heurístico, gratis) y muestra:
 *   - tipo + nivel detectado
 *   - intención inferida + módulo
 *   - riesgo, créditos estimados, archivos que va a tocar
 *   - botones: Confirmar (dispara sendPrompt existente),
 *              Revertir (restaura la versión anterior),
 *              Más opciones (alternativas)
 *
 * Reusa toda la infraestructura existente — no duplica streaming, no toca
 * edge functions. La confirmación pasa por sendPrompt → edit-stream → versions
 * automáticas → revertir = cargar versión previa (ya soportado).
 */
export function IntentPlanPanel() {
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

  const [expanded, setExpanded] = useState(true);
  const [reverting, setReverting] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // Memoria persistente del proyecto (Nexa Intelligence).
  const {
    acceptedIds,
    registerAccepted,
    registerModule,
    registerRevert,
    syncContext,
  } = useNexaMemory(projectId);

  const lastUserPrompt = useMemo(() => {
    const safe = Array.isArray(messages) ? messages : [];
    for (let i = safe.length - 1; i >= 0; i -= 1) {
      const m = safe[i];
      if (m && m.role === 'user' && typeof m.content === 'string') return m.content;
    }
    return '';
  }, [messages]);

  // Snapshot reactivo — recalcula cuando cambia el proyecto.
  const [snap, setSnap] = useState<IntentSnapshot | null>(null);
  useEffect(() => {
    const result = analyzeProject({ projectName, files, lastUserPrompt, acceptedIds });
    setSnap(result);
    // Persistimos kind/level más recientes para que la memoria refleje el contexto.
    syncContext({ kind: result.kind, level: result.level }).catch(() => {});
  }, [projectName, files, lastUserPrompt, acceptedIds, syncContext]);

  // Preview diff ANTES vs DESPUÉS — clasifica cada archivo afectado.
  // (Hooks SIEMPRE antes de cualquier early return.)
  const existingPaths = useMemo(() => new Set(files.map((f) => f.path)), [files]);
  const planFiles = snap?.primary?.filesAffected ?? [];
  const diffEntries = useMemo(() => {
    return planFiles.map((path) => {
      const isPlaceholder = path.includes('<new>');
      const exists = !isPlaceholder && existingPaths.has(path);
      return {
        path,
        kind: exists ? ('modified' as const) : ('created' as const),
      };
    });
  }, [planFiles, existingPaths]);

  if (!snap || files.length === 0 || !snap.primary) return null;

  const busy = loading || streaming;
  const plan = snap.primary;
  const createdCount = diffEntries.filter((d) => d.kind === 'created').length;
  const modifiedCount = diffEntries.filter((d) => d.kind === 'modified').length;

  const handleConfirm = async (p: IntentPlan) => {
    if (busy) {
      toast.info('La IA está ocupada, espera a que termine');
      return;
    }
    // Acción especial PWA — no consume créditos, no pasa por LLM.
    if (p.action.uiAction === 'activate-pwa') {
      try {
        await activatePwaForCurrentProject();
        toast.success('PWA activada');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error activando PWA');
      }
      return;
    }
    if (!chatOpen) toggleChat();
    toast.success(`Implementando: ${p.intent}`);
    try {
      await sendPrompt(p.prompt);
      // Enriquecemos memoria: la sugerencia se aceptó y el módulo quedó instalado.
      await registerAccepted({ id: p.action.id, label: p.intent });
      await registerModule({
        id: p.module,
        label: p.intent,
        credits: p.estimatedCredits,
        actionId: p.action.id,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al implementar');
    }
  };

  /**
   * Revertir = cargar la PEN\u00daLTIMA versi\u00f3n (la actual es la \u00faltima
   * checkpoint guardada). Esto es el "undo" estructural del builder y reusa
   * loadVersion() que ya estaba implementado para VersionHistory.
   */
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
      // versions[0] es la m\u00e1s reciente — saltamos a la siguiente.
      const target = versions[1];
      await loadVersion(target.id);
      toast.success(`Revertido a v${target.version_number}`);
      await registerRevert(`Revertido a v${target.version_number}`);
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
    <div className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-card/40 to-accent/5 px-3 py-2 backdrop-blur">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 text-left"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
          <Wand2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Próximo paso recomendado</span>
            <span className="rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              {snap.kindLabel}
            </span>
            <span className="rounded border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent">
              Nivel: {snap.levelLabel}
            </span>
          </div>
          <div className="truncate text-sm font-semibold text-foreground">
            {plan.intent}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-xs leading-relaxed text-muted-foreground">{plan.reason}</p>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded border px-2 py-0.5 font-semibold',
                riskTone[plan.risk],
              )}
              title="Riesgo estructural del cambio"
            >
              <ShieldAlert className="h-3 w-3" />
              Riesgo: {RISK_LABELS[plan.risk]}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-0.5 font-semibold text-foreground"
              title="Créditos estimados (varía según complejidad real)"
            >
              <Coins className="h-3 w-3" />
              {plan.estimatedCredits === 0 ? 'Gratis' : `~${plan.estimatedCredits} créditos`}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-0.5 font-semibold text-foreground"
              title="Módulo lógico afectado"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              {plan.module}
            </span>
          </div>

          {plan.filesAffected.length > 0 && (
            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <FileEdit className="mt-0.5 h-3 w-3 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {plan.filesAffected.map((f) => (
                  <code
                    key={f}
                    className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    {f}
                  </code>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-1.5 rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span>
              <span className="font-semibold text-foreground">Resultado esperado:</span>{' '}
              {plan.expectedOutcome}
            </span>
          </div>

          {plan.risk === 'high' && (
            <div className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                Este cambio toca estructura (auth/db/admin). Si algo falla puedes revertir
                con el botón <strong>Revertir último cambio</strong>.
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => handleConfirm(plan)}
              disabled={busy}
              className="h-8 gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
              data-testid="intent-confirm"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Confirmar e implementar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRevert}
              disabled={reverting || busy}
              className="h-8 gap-1.5"
              data-testid="intent-revert"
            >
              {reverting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Undo2 className="h-3.5 w-3.5" />
              )}
              Revertir último cambio
            </Button>

            {snap.alternatives.length > 0 && (
              <div className="ml-auto flex items-center gap-1 overflow-x-auto">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Alt:
                </span>
                {snap.alternatives.map((alt) => (
                  <button
                    key={alt.action.id}
                    type="button"
                    onClick={() => handleConfirm(alt)}
                    disabled={busy}
                    title={`${alt.intent} · ${RISK_LABELS[alt.risk]} · ~${alt.estimatedCredits} créditos`}
                    className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    {alt.intent}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}