import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useBuilderStore } from '@/features/builder/builderStore';
import { getQuickActions, type QuickAction } from '@/features/builder/suggestions/contextualActions';
import { cn } from '@/lib/utils';

const toneClasses: Record<NonNullable<QuickAction['tone']>, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
  accent: 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20',
  muted: 'bg-muted text-muted-foreground border-border hover:bg-muted/70',
};

/**
 * Contextual quick actions inside the chat panel. Detects what kind of app
 * the user is building (landing, dashboard, POS, CRM, etc.) and surfaces
 * 4–6 action buttons that send a real prompt to the AI when clicked.
 * Hidden when there are no files yet (the empty-state already shows
 * starter prompts) or while the AI is busy.
 */
export function QuickActions() {
  const files = useBuilderStore((s) => s.files);
  const projectName = useBuilderStore((s) => s.projectName);
  const loading = useBuilderStore((s) => s.loading);
  const sendPrompt = useBuilderStore((s) => s.sendPrompt);

  const { actions } = useMemo(
    () => getQuickActions(projectName, files),
    [projectName, files],
  );

  if (files.length === 0 || loading || actions.length === 0) return null;

  return (
    <div className="border-t border-border/30 px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-2.5 w-2.5 text-primary" />
        Acciones sugeridas
      </div>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => sendPrompt(action.prompt)}
            className={cn(
              'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
              toneClasses[action.tone ?? 'muted'],
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}