import { useRef, useEffect } from 'react';
import { useBuilder } from '@/hooks/useBuilder';
import { PromptInput } from './PromptInput';
import { Loader } from '@/components/ui/Loader';
import { Bot, User, Sparkles } from 'lucide-react';

export function ChatPanel() {
  const { messages, loading, model, sendPrompt } = useBuilder();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex w-80 flex-col border-l border-border/50 bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Chat IA</span>
        <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">{model}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground/60">Describe la app que quieres crear</p>
            <p className="mt-1 text-xs text-muted-foreground/40">Ejemplo: "Una app de notas con drag and drop"</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-primary">
                <Bot className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}>
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader size="sm" /> Generando...
          </div>
        )}
      </div>

      <PromptInput onSend={sendPrompt} disabled={loading} />
    </div>
  );
}
