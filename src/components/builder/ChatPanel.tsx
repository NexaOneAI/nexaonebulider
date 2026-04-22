import { useRef, useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useBuilder } from '@/hooks/useBuilder';
import { useBuilderStore } from '@/features/builder/builderStore';
import { usePreviewErrorsStore } from '@/features/builder/previewErrorsStore';
import { PromptInput } from './PromptInput';
import { Loader } from '@/components/ui/Loader';
import { QuickActions } from './QuickActions';
import {
  Bot, User, Sparkles, Zap, Gauge, AlertTriangle, Wand2, FileCode, Activity, X, MessageSquarePlus,
} from 'lucide-react';
import { AI_MODEL_LABELS, CREDIT_COSTS } from '@/lib/constants';
import type { Tier } from '@/features/ai/providers/types';
import {
  getStreamEditStrategy,
  setStreamEditStrategy,
  subscribeStreamEditStrategy,
  type StreamEditStrategy,
} from '@/features/builder/streamPrefs';
import {
  getChatCutoff,
  setChatCutoff,
  clearChatCutoff,
  subscribeChatCutoff,
} from '@/features/builder/chatCutoff';

const TIER_LABELS: Record<Tier, { label: string; cost: number }> = {
  simple_task: { label: 'Tarea simple', cost: CREDIT_COSTS.simple_task },
  simple_edit: { label: 'Edición rápida', cost: CREDIT_COSTS.simple_edit },
  medium_module: { label: 'Módulo medio', cost: CREDIT_COSTS.medium_module },
  complex_module: { label: 'Módulo complejo', cost: CREDIT_COSTS.complex_module },
  full_app: { label: 'App completa', cost: CREDIT_COSTS.full_app },
};

export function ChatPanel() {
  const { messages, loading, model, sendPrompt } = useBuilder();
  const projectId = useBuilderStore((s) => s.projectId);
  const creditsRemaining = useBuilderStore((s) => s.creditsRemaining);
  const tier = useBuilderStore((s) => s.tier);
  const setTier = useBuilderStore((s) => s.setTier);
  const filesCount = useBuilderStore((s) => s.files.length);
  const fixWithAI = useBuilderStore((s) => s.fixWithAI);
  const streaming = useBuilderStore((s) => s.streaming);
  const streamingFiles = useBuilderStore((s) => s.streamingFiles);
  const previewErrors = usePreviewErrorsStore((s) => s.errors);
  const removePreviewError = usePreviewErrorsStore((s) => s.remove);
  const clearPreviewErrors = usePreviewErrorsStore((s) => s.clear);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTierMenu, setShowTierMenu] = useState(false);
  const [strategy, setStrategy] = useState<StreamEditStrategy>(() => getStreamEditStrategy());
  const [cutoff, setCutoffState] = useState<string | null>(() => getChatCutoff(projectId));

  useEffect(() => subscribeStreamEditStrategy(setStrategy), []);
  useEffect(() => {
    setCutoffState(getChatCutoff(projectId));
    return subscribeChatCutoff(() => setCutoffState(getChatCutoff(projectId)));
  }, [projectId]);

  const visibleMessages = useMemo(() => {
    if (!cutoff) return messages;
    return messages.filter((m) => (m.created_at || '') > cutoff);
  }, [messages, cutoff]);

  const hiddenCount = messages.length - visibleMessages.length;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleMessages, streamingFiles.length]);

  const modelLabel = AI_MODEL_LABELS[model] || model;
  const isEdit = filesCount > 0;

  // Default suggested tiers based on context
  const tierOptions: Tier[] = isEdit
    ? ['simple_edit', 'medium_module', 'complex_module']
    : ['simple_task', 'medium_module', 'complex_module', 'full_app'];

  const toggleStrategy = () => {
    const next: StreamEditStrategy = strategy === 'progressive' ? 'tokens-only' : 'progressive';
    setStreamEditStrategy(next);
    setStrategy(next);
  };

  const startNewConversation = () => {
    if (!projectId) return;
    const ok = window.confirm(
      'Iniciar nueva conversación: la IA dejará de usar los mensajes anteriores como contexto. Los archivos del proyecto y el historial de versiones no se ven afectados. ¿Continuar?',
    );
    if (!ok) return;
    setChatCutoff(projectId);
  };

  const restorePreviousConversation = () => {
    if (!projectId) return;
    clearChatCutoff(projectId);
  };

  return (
    <div className="flex w-80 flex-col border-l border-border/50 bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Chat IA</span>
        <button
          type="button"
          onClick={startNewConversation}
          disabled={!projectId || loading || messages.length === 0}
          title="Iniciar nueva conversación: la IA dejará de usar el historial previo como contexto. Los archivos no se ven afectados."
          className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        >
          <MessageSquarePlus className="h-2.5 w-2.5" />
          Nueva
        </button>
        <button
          type="button"
          onClick={toggleStrategy}
          title={
            strategy === 'progressive'
              ? 'Modo A: bloques aplicándose en vivo. Click para cambiar a modo simple.'
              : 'Modo B: solo tokens, cambios al final. Click para activar bloques en vivo.'
          }
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors ${
            strategy === 'progressive'
              ? 'bg-primary/15 text-primary hover:bg-primary/25'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          }`}
        >
          <Activity className="h-2.5 w-2.5" />
          {strategy === 'progressive' ? 'Live diffs' : 'Solo tokens'}
        </button>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {modelLabel}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {cutoff && hiddenCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[10px] text-muted-foreground">
            <MessageSquarePlus className="h-3 w-3 text-primary" />
            <span className="flex-1">
              Nueva conversación · {hiddenCount} {hiddenCount === 1 ? 'mensaje oculto' : 'mensajes ocultos'} del contexto
            </span>
            <button
              type="button"
              onClick={restorePreviousConversation}
              className="text-primary hover:underline"
            >
              restaurar
            </button>
          </div>
        )}
        {visibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
              <Bot className="h-7 w-7 text-primary/60" />
            </div>
            <p className="text-sm font-medium text-muted-foreground/80">Describe la app que quieres crear</p>
            <p className="mt-1 text-xs text-muted-foreground/50">
              Ejemplo: "Una app de tareas con categorías y drag & drop"
            </p>
            <div className="mt-6 space-y-2">
              {[
                'Crea un dashboard de ventas con gráficos',
                'Una landing page para un SaaS de IA',
                'App de notas con markdown y tags',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendPrompt(suggestion)}
                  className="block w-full rounded-lg border border-border/50 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {visibleMessages.map((msg, idx) => {
          const isLastAssistant =
            msg.role === 'assistant' && idx === visibleMessages.length - 1 && streaming;
          const isEmpty = msg.role === 'assistant' && msg.content.length === 0;
          return (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-primary">
                  <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none [&>p]:my-0 [&_code]:text-xs">
                    {isEmpty && isLastAssistant ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                        Pensando...
                      </span>
                    ) : (
                      <>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {isLastAssistant && (
                          <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}
        {streaming && streamingFiles.length > 0 && (
          <div className="ml-9 space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-2">
            <div className="text-[10px] font-medium uppercase tracking-wider text-primary/80">
              Archivos detectados
            </div>
            {streamingFiles.map((path) => (
              <div
                key={path}
                className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground animate-in fade-in slide-in-from-left-1"
              >
                <FileCode className="h-3 w-3 text-primary/60" />
                {path}
              </div>
            ))}
          </div>
        )}
        {loading && !streaming && (
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
            <Loader size="sm" />
            <span>Generando con {modelLabel}...</span>
          </div>
        )}
      </div>

      {/* Tier selector */}
      <div className="border-t border-border/30 px-3 py-2">
        {/* Quick actions are rendered above the tier selector but only when
            there is generated code, so they don't compete with the empty-state
            starter prompts. */}
      </div>
      <QuickActions />
      <div className="border-t border-border/30 px-3 py-2">
        <button
          type="button"
          onClick={() => setShowTierMenu((s) => !s)}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <Gauge className="h-3 w-3" />
          <span>Costo:</span>
          {tier ? (
            <span className="font-medium text-primary">
              {TIER_LABELS[tier].label} ({TIER_LABELS[tier].cost} cr)
            </span>
          ) : (
            <span>Auto (estimado por la IA)</span>
          )}
          <span className="ml-auto opacity-50">{showTierMenu ? '▲' : '▼'}</span>
        </button>

        {showTierMenu && (
          <div className="mt-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => { setTier(null); setShowTierMenu(false); }}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] transition-colors hover:bg-muted/50 ${
                !tier ? 'bg-muted/50 text-foreground' : 'text-muted-foreground'
              }`}
            >
              <span>Auto</span>
              <span className="opacity-60">heurística</span>
            </button>
            {tierOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTier(t); setShowTierMenu(false); }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] transition-colors hover:bg-muted/50 ${
                  tier === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                <span>{TIER_LABELS[t].label}</span>
                <span className="font-mono">{TIER_LABELS[t].cost} cr</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Credits indicator */}
      {creditsRemaining >= 0 && (
        <div className="flex items-center gap-1.5 border-t border-border/30 px-4 py-1.5">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-muted-foreground">
            {creditsRemaining} créditos disponibles
          </span>
        </div>
      )}

      {/* Preview runtime errors → Fix with AI (lista con dedupe) */}
      {previewErrors.length > 0 && !loading && (
        <div className="max-h-48 overflow-y-auto border-t border-destructive/30 bg-destructive/5 px-3 py-2">
          <div className="mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
              {previewErrors.length} {previewErrors.length === 1 ? 'error' : 'errores'} en preview
            </span>
            {previewErrors.length > 1 && (
              <button
                type="button"
                onClick={clearPreviewErrors}
                className="ml-auto text-[10px] text-destructive/70 hover:text-destructive"
              >
                limpiar
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {previewErrors.slice(-3).map((err) => (
              <div
                key={err.id}
                className="rounded-md border border-destructive/20 bg-background/40 p-2"
              >
                <div className="mb-1.5 flex items-start gap-1.5">
                  <p className="line-clamp-2 flex-1 text-[11px] text-destructive/90">
                    {err.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => removePreviewError(err.id)}
                    className="shrink-0 text-destructive/50 hover:text-destructive"
                    title="Descartar"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {(err.inferredFile || err.occurrences.length > 1) && (
                  <div className="mb-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    {err.inferredFile && (
                      <span className="font-mono">
                        📄 {err.inferredFile}
                        {err.inferredLine ? `:${err.inferredLine}` : ''}
                      </span>
                    )}
                    {err.occurrences.length > 1 && (
                      <span>×{err.occurrences.length}</span>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fixWithAI(err.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/20"
                >
                  <Wand2 className="h-3 w-3" />
                  {err.inferredFile ? 'Arreglar con IA (con contexto)' : 'Arreglar con IA'} (3 cr)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <PromptInput onSend={sendPrompt} disabled={loading} />
    </div>
  );
}
