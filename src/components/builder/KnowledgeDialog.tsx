import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Brain, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getKnowledge, upsertKnowledge } from '@/features/knowledge/knowledgeService';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

const PLACEHOLDER = `Ejemplos:
• Stack preferido: React + Tailwind + shadcn
• Estilo visual: dark theme, neón sutil, esquinas redondeadas
• Reglas de negocio: precios en MXN, IVA 16%, envío gratis sobre $500
• Tono de copy: directo, en español de México
• No usar: animaciones excesivas, popups, modo claro`;

export function KnowledgeDialog({ open, onClose, projectId }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    getKnowledge(projectId)
      .then((k) => {
        setContent(k?.content ?? '');
        setEnabled(k?.enabled ?? true);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Error al cargar knowledge'))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await upsertKnowledge(projectId, user.id, content.trim(), enabled);
      toast.success('Knowledge guardado · se inyectará en cada prompt');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Knowledge del proyecto
          </DialogTitle>
          <DialogDescription>
            Instrucciones persistentes que se añaden al system prompt en cada generación o
            edición. Úsalo para fijar stack, estilo, reglas de negocio o restricciones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <div>
              <Label htmlFor="kn-enabled" className="cursor-pointer text-sm font-medium">
                Activado
              </Label>
              <p className="text-xs text-muted-foreground">
                Si está apagado, el knowledge no se envía a la IA.
              </p>
            </div>
            <Switch id="kn-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={PLACEHOLDER}
            disabled={loading}
            className="min-h-[260px] resize-y font-mono text-xs"
            maxLength={4000}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.length} / 4000 caracteres</span>
            <span>Se inyecta como bloque "## Project Knowledge" en cada prompt</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
