import { useRef, useEffect, useState } from 'react';
import { useBuilder } from '@/hooks/useBuilder';
import { useBuilderStore } from '@/features/builder/builderStore';
import { PromptInput } from './PromptInput';
import { Loader } from '@/components/ui/Loader';
import { Bot, User, Sparkles, Zap, Gauge } from 'lucide-react';
import { AI_MODEL_LABELS, CREDIT_COSTS } from '@/lib/constants';
import type { Tier } from '@/features/ai/providers/types';

const TIER_LABELS: Record<Tier, { label: string; cost: number }> = {
  simple_task: { label: 'Tarea simple', cost: CREDIT_COSTS.simple_task },
  simple_edit: { label: 'Edición rápida', cost: CREDIT_COSTS.simple_edit },
  medium_module: { label: 'Módulo medio', cost: CREDIT_COSTS.medium_module },
  complex_module: { label: 'Módulo complejo', cost: CREDIT_COSTS.complex_module },
  full_app: { label: 'App completa', cost: CREDIT_COSTS.full_app },
};

export function ChatPanel() {
  const { messages, loading, model, sendPrompt } = useBuilder();
  const creditsRemaining = useBuilderStore((s) => s.creditsRemaining);
  const tier = useBuilderStore((s) => s.tier);
  const setTier = useBuilderStore((s) => s.setTier);
  const filesCount = useBuilderStore((s) => s.files.length);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTierMenu, setShowTierMenu] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const modelLabel = AI_MODEL_LABELS[model] || model;
  const isEdit = filesCount > 0;

  // Default suggested tiers based on context
  const tierOptions: Tier[] = isEdit
    ? ['simple_edit', 'medium_module', 'complex_module']
    : ['simple_task', 'medium_module', 'complex_module', 'full_app'];

  return (
    <div className="flex w-80 flex-col border-l border-border/50 bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Chat IA</span>
        <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {modelLabel}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
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
        {messages.map((msg) => (
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
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
            <Loader size="sm" />
            <span>Generando con {modelLabel}...</span>
          </div>
        )}
      </div>

      {/* Tier selector */}
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

      <PromptInput onSend={sendPrompt} disabled={loading} />
    </div>
  );
}
