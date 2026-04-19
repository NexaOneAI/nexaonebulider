/**
 * Bottom-of-preview action bar shown while there are pending visual edits.
 * Lets the user discard or commit the changes as a new (free) version, and
 * revert individual edits via a popover-style list.
 */
import { useState } from 'react';
import { useVisualEditsStore } from '@/features/visualEdits/visualEditsStore';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Save, Undo2, Sparkles, ListOrdered, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function VisualEditsActionBar() {
  const pending = useVisualEditsStore((s) => s.pending);
  const saving = useVisualEditsStore((s) => s.saving);
  const discard = useVisualEditsStore((s) => s.discardPending);
  const revertEdit = useVisualEditsStore((s) => s.revertEdit);
  const commit = useVisualEditsStore((s) => s.commit);
  const [listOpen, setListOpen] = useState(false);

  if (pending.length === 0) return null;

  const onSave = async () => {
    const res = await commit();
    if (res.ok) toast.success(`${pending.length} cambios guardados (sin créditos)`);
    else toast.error(`Error: ${res.error}`);
  };

  return (
    <div className="flex items-center gap-2 border-t border-primary/30 bg-primary/5 px-4 py-2">
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-medium text-foreground">
        {pending.length} cambio{pending.length === 1 ? '' : 's'} sin guardar
      </span>
      <span className="text-[10px] text-muted-foreground">· no consume créditos · Ctrl+S guarda</span>

      <Popover open={listOpen} onOpenChange={setListOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="ml-2 h-7 text-xs">
            <ListOrdered className="mr-1 h-3 w-3" />
            Ver lista
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[360px] p-2">
          <div className="mb-1.5 px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Cambios pendientes
          </div>
          <div className="max-h-[280px] space-y-1 overflow-auto">
            {pending.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded border border-border/40 bg-card/50 px-2 py-1.5"
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  #{i + 1}
                </span>
                <span className="rounded bg-primary/10 px-1 font-mono text-[10px] text-primary">
                  {p.element.tag}
                </span>
                <span className="flex-1 truncate text-[11px] text-foreground" title={p.label}>
                  {p.label}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[10px]"
                  onClick={() => revertEdit(p.id)}
                  title="Revertir este cambio"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex gap-1.5">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={discard} disabled={saving}>
          <Undo2 className="mr-1 h-3 w-3" />
          Descartar
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={onSave} disabled={saving}>
          <Save className="mr-1 h-3 w-3" />
          {saving ? 'Guardando...' : 'Guardar versión'}
        </Button>
      </div>
    </div>
  );
}
