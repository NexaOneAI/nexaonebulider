import { AI_PROVIDERS } from '@/features/ai/aiTypes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {AI_PROVIDERS.map((p) => (
          <SelectItem key={p.id} value={p.id} disabled={!p.available}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
