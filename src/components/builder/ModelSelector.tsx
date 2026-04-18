import { AI_PROVIDERS, type AIProviderId } from '@/features/ai/aiTypes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot } from 'lucide-react';

interface Props {
  value: string;
  onChange: (model: string) => void;
}

const GROUPS: { id: AIProviderId; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'google', label: 'Google' },
  { id: 'claude', label: 'Anthropic' },
  { id: 'grok', label: 'xAI' },
];

export function ModelSelector({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-44 gap-1.5 text-xs">
        <Bot className="h-3.5 w-3.5 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GROUPS.map((group) => {
          const items = AI_PROVIDERS.filter((p) => p.provider === group.id);
          if (items.length === 0) return null;
          return (
            <div key={group.id}>
              <div className="mt-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
              {items.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  disabled={!p.available}
                  className="text-xs"
                >
                  {p.label}
                </SelectItem>
              ))}
            </div>
          );
        })}
      </SelectContent>
    </Select>
  );
}
