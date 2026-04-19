/**
 * Bottom-of-preview action bar shown while there are pending visual edits.
 * Lets the user discard or commit the changes as a new (free) version.
 */
import { useVisualEditsStore } from '@/features/visualEdits/visualEditsStore';
import { Button } from '@/components/ui/button';
import { Save, Undo2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function VisualEditsActionBar() {
  const pending = useVisualEditsStore((s) => s.pending);
  const saving = useVisualEditsStore((s) => s.saving);
  const discard = useVisualEditsStore((s) => s.discardPending);
  const commit = useVisualEditsStore((s) => s.commit);

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
      <span className="text-[10px] text-muted-foreground">· no consume créditos</span>
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
