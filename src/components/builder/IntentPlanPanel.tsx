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
  Code2,
  Copy,
  Check,
  ScanSearch,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBuilderStore } from '@/features/builder/builderStore';
import {
  analyzeProject,
  RISK_LABELS,
  planToJson,
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
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [impactOpen, setImpactOpen] = useState(false);
  /**
   * Set de planes (por action.id) cuyo impacto el usuario ya revisó.
   * Bloqueamos "Aplicar" hasta que la acción específica esté en este set.
   * Al cambiar el snapshot (nuevo plan recomendado), se resetea implícitamente
   * porque el id cambia.
   */
  const [reviewedPlanIds, setReviewedPlanIds] = useState<Set<string>>(new Set());

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
  const planJson = planToJson(plan);
  const planJsonStr = JSON.stringify(planJson, null, 2);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(planJsonStr);
      setCopied(true);
      toast.success('JSON copiado');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleConfirm = async (p: IntentPlan) => {
    if (busy) {
      toast.info('La IA está ocupada, espera a que termine');
      return;
    }
    // Acciones que tocan código requieren revisión de impacto previa.
    // PWA y similares (uiAction local sin LLM) están exentas porque no
    // generan diff de archivos del proyecto.
    const requiresReview = !p.action.uiAction;
    if (requiresReview && !reviewedPlanIds.has(p.action.id)) {
      setImpactOpen(true);
      toast.info('Revisa el impacto antes de aplicar el cambio');
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

          {diffEntries.length > 0 && (
            <div className="rounded-md border border-border/60 bg-card/60">
              <button
                type="button"
                onClick={() => setShowDiff((s) => !s)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] hover:bg-muted/40"
                aria-expanded={showDiff}
              >
                <GitCompare className="h-3 w-3 text-primary" />
                <span className="font-semibold text-foreground">
                  Vista previa de cambios
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {createdCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                      +{createdCount} nuevo{createdCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {modifiedCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                      ~{modifiedCount} modificado{modifiedCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  {showDiff ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showDiff ? 'Ocultar' : 'Ver diff'}
                </span>
              </button>
              {showDiff && (
                <div className="grid gap-2 border-t border-border/60 p-2 sm:grid-cols-2">
                  {/* ANTES */}
                  <div className="rounded border border-border/60 bg-muted/30 p-2">
                    <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-foreground">ANTES</span>
                      <span>estado actual</span>
                    </div>
                    <ul className="space-y-1 font-mono text-[10px]">
                      {diffEntries.map((d) => (
                        <li
                          key={`before-${d.path}`}
                          className={cn(
                            'flex items-center gap-1.5 rounded px-1.5 py-0.5',
                            d.kind === 'created'
                              ? 'bg-destructive/10 text-muted-foreground line-through'
                              : 'bg-muted/40 text-foreground',
                          )}
                        >
                          <span className="w-3 text-center">
                            {d.kind === 'created' ? '−' : '·'}
                          </span>
                          <code className="truncate">
                            {d.kind === 'created' ? '(no existe)' : d.path}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* DESPUÉS */}
                  <div className="rounded border border-primary/40 bg-primary/5 p-2">
                    <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <span className="rounded bg-primary/20 px-1.5 py-0.5">DESPUÉS</span>
                      <span className="text-muted-foreground">tras aplicar el módulo</span>
                    </div>
                    <ul className="space-y-1 font-mono text-[10px]">
                      {diffEntries.map((d) => (
                        <li
                          key={`after-${d.path}`}
                          className={cn(
                            'flex items-center gap-1.5 rounded px-1.5 py-0.5',
                            d.kind === 'created'
                              ? 'bg-primary/15 text-primary'
                              : 'bg-accent/15 text-accent',
                          )}
                        >
                          {d.kind === 'created' ? (
                            <FilePlus2 className="h-3 w-3 shrink-0" />
                          ) : (
                            <FileCog className="h-3 w-3 shrink-0" />
                          )}
                          <code className="truncate text-foreground">{d.path}</code>
                          <span className="ml-auto text-[9px] uppercase tracking-wider opacity-80">
                            {d.kind === 'created' ? 'nuevo' : 'editado'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {!showDiff && (
                <div className="flex flex-wrap items-start gap-1 px-2 pb-2 text-[11px] text-muted-foreground">
                  <FileEdit className="mt-0.5 h-3 w-3 shrink-0" />
                  {diffEntries.map((d) => (
                    <code
                      key={d.path}
                      className={cn(
                        'rounded px-1.5 py-0.5 font-mono text-[10px]',
                        d.kind === 'created'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-accent/15 text-accent',
                      )}
                      title={d.kind === 'created' ? 'Se creará' : 'Se modificará'}
                    >
                      {d.kind === 'created' ? '+ ' : '~ '}
                      {d.path}
                    </code>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-1.5 rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span>
              <span className="font-semibold text-foreground">Resultado esperado:</span>{' '}
              {plan.expectedOutcome}
            </span>
          </div>

          <div className="rounded-md border border-border/60 bg-card/60">
            <div className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setShowJson((s) => !s)}
                className="flex items-center gap-1.5 text-left font-semibold text-foreground hover:text-primary"
                aria-expanded={showJson}
              >
                <Code2 className="h-3 w-3 text-primary" />
                Plan en JSON
                <span className="text-muted-foreground">(contrato Nexa One)</span>
              </button>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                  title="Copiar JSON"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowJson((s) => !s)}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {showJson ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showJson ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
            {showJson && (
              <pre className="max-h-56 overflow-auto border-t border-border/60 bg-background/60 px-2 py-2 font-mono text-[10px] leading-relaxed text-foreground">
                {planJsonStr}
              </pre>
            )}
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

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              variant={reviewedPlanIds.has(plan.action.id) ? 'outline' : 'default'}
              onClick={() => setImpactOpen(true)}
              className="h-8 gap-1.5"
              data-testid="intent-view-impact"
            >
              <ScanSearch className="h-3.5 w-3.5" />
              Ver impacto
              {reviewedPlanIds.has(plan.action.id) && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => handleConfirm(plan)}
              disabled={busy || (!plan.action.uiAction && !reviewedPlanIds.has(plan.action.id))}
              className="h-8 gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
              data-testid="intent-confirm"
              title={
                !plan.action.uiAction && !reviewedPlanIds.has(plan.action.id)
                  ? 'Revisa el impacto antes de aplicar'
                  : 'Aplicar el módulo recomendado'
              }
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : !plan.action.uiAction && !reviewedPlanIds.has(plan.action.id) ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Aplicar
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

      {/* Modal de impacto — claridad + control antes de aplicar */}
      <Dialog open={impactOpen} onOpenChange={setImpactOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-primary" />
              Impacto del cambio
            </DialogTitle>
            <DialogDescription>
              Revisa qué tocará la IA antes de ejecutar el módulo{' '}
              <span className="font-mono text-foreground">{plan.module}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Resumen claro */}
            <div className="rounded-md border border-border bg-card/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Resumen
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">{plan.intent}</p>
              <p className="mt-1 text-xs text-muted-foreground">{plan.expectedOutcome}</p>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className={cn('rounded border p-2 text-center font-semibold', riskTone[plan.risk])}>
                <ShieldAlert className="mx-auto mb-1 h-3.5 w-3.5" />
                Riesgo: {RISK_LABELS[plan.risk]}
              </div>
              <div className="rounded border border-border bg-muted/40 p-2 text-center font-semibold text-foreground">
                <Coins className="mx-auto mb-1 h-3.5 w-3.5" />
                {plan.estimatedCredits === 0 ? 'Gratis' : `~${plan.estimatedCredits} créditos`}
              </div>
              <div className="rounded border border-border bg-muted/40 p-2 text-center font-semibold text-foreground">
                <FileEdit className="mx-auto mb-1 h-3.5 w-3.5" />
                {createdCount + modifiedCount} archivo
                {createdCount + modifiedCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Cambios conceptuales */}
            {planJson.cambios.length > 0 && (
              <div className="rounded-md border border-border bg-card/60 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Cambios que se aplicarán
                </div>
                <ul className="mt-1.5 space-y-1 text-xs text-foreground">
                  {planJson.cambios.map((c) => (
                    <li key={c} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Diff conceptual de archivos */}
            <div className="rounded-md border border-border bg-card/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Archivos que se tocarán ({createdCount} nuevos · {modifiedCount} modificados)
              </div>
              <ul className="mt-1.5 max-h-48 space-y-1 overflow-auto font-mono text-[11px]">
                {diffEntries.map((d) => (
                  <li
                    key={`impact-${d.path}`}
                    className={cn(
                      'flex items-center gap-2 rounded px-2 py-1',
                      d.kind === 'created'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-accent/10 text-accent',
                    )}
                  >
                    {d.kind === 'created' ? (
                      <FilePlus2 className="h-3 w-3 shrink-0" />
                    ) : (
                      <FileCog className="h-3 w-3 shrink-0" />
                    )}
                    <code className="flex-1 truncate text-foreground">{d.path}</code>
                    <span className="text-[9px] uppercase tracking-wider opacity-80">
                      {d.kind === 'created' ? 'nuevo' : 'editado'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] italic text-muted-foreground">
                Estimación heurística — la IA puede tocar archivos adicionales si lo necesita.
              </p>
            </div>

            {/* Advertencia de riesgo alto */}
            {plan.risk === 'high' && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Cambio de alto riesgo</p>
                  <p className="mt-0.5 text-destructive/90">
                    Toca estructura crítica (auth, base de datos o admin). Si algo se rompe,
                    usa <strong>Revertir último cambio</strong> para volver a la versión anterior.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setImpactOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setReviewedPlanIds((s) => new Set(s).add(plan.action.id));
                setImpactOpen(false);
                toast.success('Impacto revisado — ya puedes aplicar');
              }}
              className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            >
              <Check className="h-4 w-4" />
              Entendido, desbloquear "Aplicar"
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}