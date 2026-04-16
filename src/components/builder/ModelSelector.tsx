import { AI_PROVIDERS } from '@/features/ai/aiTypes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot } from 'lucide-react';

interface Props {
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  const grouped = {
    openai: AI_PROVIDERS.filter((p) => p.provider === 'openai'),
    google: AI_PROVIDERS.filter((p) => p.provider === 'google'),
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-44 gap-1.5 text-xs">
        <Bot className="h-3.5 w-3.5 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">OpenAI</div>
        {grouped.openai.map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-xs">
            {p.label}
          </SelectItem>
        ))}
        <div className="mt-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Google</div>
        {grouped.google.map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-xs">
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
