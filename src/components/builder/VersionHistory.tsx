import { useEffect, useState } from 'react';
import { Clock, RotateCcw, X, Check } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { versionsService, type ProjectVersion } from '@/features/projects/versionsService';
import { useBuilderStore } from '@/features/builder/builderStore';
import { AI_MODEL_LABELS } from '@/lib/constants';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function VersionHistory({ open, onClose }: Props) {
  const projectId = useBuilderStore((s) => s.projectId);
  const loadVersion = useBuilderStore((s) => s.loadVersion);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    setLoading(true);
    versionsService.list(projectId).then((rows) => {
      if (!cancelled) {
        setVersions(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const handleRestore = async (version: ProjectVersion) => {
    setRestoringId(version.id);
    try {
      await loadVersion(version.id);
      toast.success(`Versión ${version.version_number} restaurada`);
      onClose();
    } catch {
      toast.error('No se pudo restaurar la versión');
    } finally {
      setRestoringId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-96 flex-col border-l border-border/50 bg-card shadow-elevated">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Historial de versiones</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size="sm" />
          </div>
        ) : versions.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Clock className="h-10 w-10" />}
              title="Sin versiones aún"
              description="Cada generación o edición se guardará automáticamente aquí"
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {versions.map((v, idx) => (
              <li key={v.id} className="px-4 py-3 transition-colors hover:bg-muted/30">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                    v{v.version_number}
                  </span>
                  {idx === 0 && (
                    <span className="flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-500">
                      <Check className="h-2.5 w-2.5" />
                      actual
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(v.created_at).toLocaleString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-foreground/90">{v.prompt}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {AI_MODEL_LABELS[v.model_used] || v.model_used} ·{' '}
                    {v.generated_files.length} archivos
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    disabled={restoringId === v.id}
                    onClick={() => handleRestore(v)}
                  >
                    <RotateCcw className="mr-1 h-2.5 w-2.5" />
                    {restoringId === v.id ? 'Restaurando…' : 'Restaurar'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
