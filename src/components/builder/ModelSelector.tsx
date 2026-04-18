import { getAllModels } from '@/features/ai/aiModels';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
            {items.map((model) => (
              <SelectItem
                key={model.id}
                value={model.id}
                disabled={!model.enabled}
                className="text-xs"
              >
                {model.label}
                {!model.enabled ? ' (próximamente)' : ''}
              </SelectItem>
            ))}
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
