import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Zap, AlertTriangle, Loader2, Image as ImageIcon } from 'lucide-react';
import { estimateCost, type CostEstimate } from '@/features/credits/estimateService';
import { useBuilderStore } from '@/features/builder/builderStore';
import { ImageGenDialog } from './ImageGenDialog';

interface Props {
  onSend: (prompt: string) => void;
  disabled?: boolean;
}

export function PromptInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const filesCount = useBuilderStore((s) => s.files.length);
  const projectId = useBuilderStore((s) => s.projectId);
  const debounceRef = useRef<number | null>(null);

  const mode: 'create' | 'edit' = filesCount > 0 ? 'edit' : 'create';

  // Hydrate from onboarding seed prompt (set by OnboardingFlow before navigating).
  useEffect(() => {
    if (!projectId) return;
    const key = `seedPrompt:${projectId}`;
    const seed = sessionStorage.getItem(key);
    if (seed) {
      setValue(seed);
      sessionStorage.removeItem(key);
    }
  }, [projectId]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (value.trim().length < 4) {
      setEstimate(null);
      setEstimating(false);
      return;
    }
    setEstimating(true);
    debounceRef.current = window.setTimeout(async () => {
      const result = await estimateCost(value.trim(), mode);
      setEstimate(result);
      setEstimating(false);
    }, 450);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
    setEstimate(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const cantAfford = estimate && !estimate.can_afford;

  return (
    <div className="border-t border-border/50">
      {/* Cost estimate bar */}
      {(estimate || estimating) && (
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] ${
            cantAfford
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted/40 text-muted-foreground'
          }`}
        >
          {estimating ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Estimando costo…</span>
            </>
          ) : estimate ? (
            <>
              {cantAfford ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Zap className="h-3 w-3 text-primary" />
              )}
              <span>
                Costo estimado: <span className="font-medium">{estimate.estimated_cost} créditos</span>
                {' · '}
                <span className="opacity-70">{estimate.complexity.replace('_', ' ')}</span>
              </span>
              {cantAfford && (
                <span className="ml-auto font-medium">
                  Tienes {estimate.current_credits}
                </span>
              )}
            </>
          ) : null}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'edit' ? 'Pide un cambio o nueva sección…' : 'Describe tu app…'}
          rows={2}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={disabled || !projectId}
          onClick={() => setImageOpen(true)}
          title="Generar imagen (4 cr) sin pasar por el detector de intent"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0 bg-gradient-primary hover:opacity-90"
          disabled={disabled || !value.trim() || cantAfford === true}
          title={cantAfford ? 'No tienes suficientes créditos' : 'Enviar (Enter)'}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
      {projectId && (
        <ImageGenDialog
          open={imageOpen}
          onClose={() => setImageOpen(false)}
          projectId={projectId}
        />
      )}
    </div>
  );
}
