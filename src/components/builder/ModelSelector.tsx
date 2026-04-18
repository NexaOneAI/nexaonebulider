import { getAllModels } from '@/features/ai/aiModels';
import type { AiModelStatus } from '@/features/ai/aiTypes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** When true, renders a labeled stacked variant (form-style). Defaults to compact toolbar style. */
  withLabel?: boolean;
};

const PROVIDER_LABEL: Record<string, string> = {
  lovable: 'Lovable',
  openai: 'OpenAI',
  gemini: 'Google',
  claude: 'Anthropic',
  grok: 'xAI',
  custom: 'Custom',
};

const PROVIDER_ORDER = ['lovable', 'openai', 'gemini', 'claude', 'grok', 'custom'] as const;

const STATUS_BADGE: Record<AiModelStatus, { label: string; className: string }> = {
  ready: { label: '', className: '' },
  preview: {
    label: 'Preparado',
    className: 'bg-accent/15 text-accent border border-accent/30',
  },
  unavailable: {
    label: 'Próximamente',
    className: 'bg-muted text-muted-foreground border border-border',
  },
};

export function ModelSelector({ value, onChange, withLabel = false }: Props) {
  const models = getAllModels();

  const trigger = (
    <SelectTrigger
      className={
        withLabel
          ? 'w-full bg-secondary/40 text-sm'
          : 'h-8 w-44 gap-1.5 text-xs'
      }
    >
      <Bot className="h-3.5 w-3.5 text-primary" />
      <SelectValue placeholder="Selecciona un modelo" />
    </SelectTrigger>
  );

  const content = (
    <SelectContent>
      {PROVIDER_ORDER.map((provider) => {
        const items = models.filter((m) => m.provider === provider);
        if (items.length === 0) return null;
        return (
          <div key={provider}>
            <div className="mt-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {PROVIDER_LABEL[provider]}
            </div>
            {items.map((model) => {
              const badge = STATUS_BADGE[model.status];
              const item = (
                <SelectItem
                  key={model.id}
                  value={model.id}
                  disabled={model.status === 'unavailable'}
                  className="text-xs"
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span>{model.label}</span>
                    {badge.label && (
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    )}
                  </span>
                </SelectItem>
              );

              if (model.status === 'preview' && model.requiresSecret) {
                return (
                  <TooltipProvider key={model.id} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block">{item}</span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[240px] text-xs">
                        Requiere configurar el secret <code className="font-mono">{model.requiresSecret}</code>.
                        Mientras tanto, las solicitudes usarán el Lovable Gateway como fallback.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }
              return item;
            })}
          </div>
        );
      })}
    </SelectContent>
  );

  if (withLabel) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Modelo IA</Label>
        <Select value={value} onValueChange={onChange}>
          {trigger}
          {content}
        </Select>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      {trigger}
      {content}
    </Select>
  );
}

export default ModelSelector;
