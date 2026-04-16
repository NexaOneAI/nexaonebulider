import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TEMPLATES, type Template } from '@/features/templates/templates';
import { projectsService } from '@/features/projects/projectsService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Sparkles, ArrowRight, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateGallery({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState<string | null>(null);

  const handleSelect = async (template: Template) => {
    if (!user) return;
    setCreating(template.id);
    try {
      const project = await projectsService.create({
        user_id: user.id,
        name: template.name,
        description: template.description,
      });
      if (!project) throw new Error('No se pudo crear el proyecto');

      // Save initial version with the template files (free, no AI cost)
      const { error: vErr } = await supabase.from('project_versions').insert({
        project_id: project.id,
        version_number: 1,
        prompt: `Plantilla inicial: ${template.name}`,
        model_used: 'template',
        generated_files: template.files as unknown as never,
        preview_code: template.previewCode,
      });
      if (vErr) throw vErr;

      toast.success(`Plantilla "${template.name}" lista`);
      onOpenChange(false);
      navigate(`/builder/${project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el proyecto');
    } finally {
      setCreating(null);
    }
  };

  const handleBlank = async () => {
    if (!user) return;
    setCreating('blank');
    try {
      const project = await projectsService.create({ user_id: user.id, name: 'Mi proyecto' });
      if (project) {
        onOpenChange(false);
        navigate(`/builder/${project.id}`);
      }
    } catch {
      toast.error('Error al crear proyecto');
    } finally {
      setCreating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Elige una plantilla
          </DialogTitle>
          <DialogDescription>
            Empieza con una base y personalízala con IA. No consume créditos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t)}
              disabled={creating !== null}
              className="group relative flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-elevated disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-2xl">
                  {t.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {t.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-1 flex items-center justify-end text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                {creating === t.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Usar plantilla <ArrowRight className="ml-1 h-4 w-4" /></>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-2 border-t border-border/50 pt-4">
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleBlank}
            disabled={creating !== null}
          >
            {creating === 'blank' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Empezar desde cero (proyecto en blanco)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
