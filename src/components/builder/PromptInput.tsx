import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface Props {
  onSend: (prompt: string) => void;
  disabled?: boolean;
}

export function PromptInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border/50 p-3">
      <Input value={value} onChange={(e) => setValue(e.target.value)}
        placeholder="Describe tu app..." className="flex-1 text-sm" disabled={disabled} />
      <Button type="submit" size="icon" className="h-9 w-9 bg-gradient-primary hover:opacity-90"
        disabled={disabled || !value.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
