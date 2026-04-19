import { useEffect, useMemo, useState } from 'react';
import { Clock, RotateCcw, X, Check, GitBranch, FileText, Sparkles, Eye } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { versionsService, type ProjectVersion } from '@/features/projects/versionsService';
import { useBuilderStore } from '@/features/builder/builderStore';
import { generatePreviewHtml } from '@/features/builder/preview';
import { AI_MODEL_LABELS } from '@/lib/constants';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

type VersionType = 'all' | 'full' | 'diff' | 'visual_edit';

const FILTER_LABELS: Record<VersionType, string> = {
  all: 'Todas',
  full: 'Full',
  diff: 'Diff',
  visual_edit: 'Visual',
};

function classifyVersion(v: ProjectVersion): VersionType {
  if (v.model_used === 'visual-edit') return 'visual_edit';
  if (v.isDiff) return 'diff';
  return 'full';
}

export function VersionHistory({ open, onClose }: Props) {
  const projectId = useBuilderStore((s) => s.projectId);
  const projectName = useBuilderStore((s) => s.projectName);
  const loadVersion = useBuilderStore((s) => s.loadVersion);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [filter, setFilter] = useState<VersionType>('all');
  const [previewing, setPreviewing] = useState<ProjectVersion | null>(null);

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

  const filtered = useMemo(() => {
    if (filter === 'all') return versions;
    return versions.filter((v) => classifyVersion(v) === filter);
  }, [versions, filter]);

  const counts = useMemo(() => {
    const c: Record<VersionType, number> = { all: versions.length, full: 0, diff: 0, visual_edit: 0 };
    for (const v of versions) c[classifyVersion(v)] += 1;
    return c;
  }, [versions]);

  const previewHtml = useMemo(() => {
    if (!previewing) return '';
    return generatePreviewHtml(previewing.generated_files, projectName, previewing.model_used);
  }, [previewing, projectName]);

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
    <>
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

        {versions.length > 0 && (
          <div className="flex items-center gap-1 border-b border-border/30 px-3 py-2">
            {(Object.keys(FILTER_LABELS) as VersionType[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors ${
                  filter === k
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted/40'
                }`}
              >
                {FILTER_LABELS[k]}
                <span className="rounded bg-background/50 px-1 text-[9px]">{counts[k]}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size="sm" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Clock className="h-10 w-10" />}
                title={versions.length === 0 ? 'Sin versiones aún' : 'Sin coincidencias'}
                description={
                  versions.length === 0
                    ? 'Cada generación o edición se guardará automáticamente aquí'
                    : `No hay versiones de tipo "${FILTER_LABELS[filter]}"`
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/30">
              {filtered.map((v) => {
                const idxInAll = versions.findIndex((x) => x.id === v.id);
                const isCurrent = idxInAll === 0;
                const type = classifyVersion(v);
                return (
                  <li key={v.id} className="px-4 py-3 transition-colors hover:bg-muted/30">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                        v{v.version_number}
                      </span>
                      {isCurrent && (
                        <span className="flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-500">
                          <Check className="h-2.5 w-2.5" />
                          actual
                        </span>
                      )}
                      {type === 'visual_edit' ? (
                        <span
                          className="flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary"
                          title="Visual edit (sin créditos)"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          visual
                        </span>
                      ) : type === 'diff' ? (
                        <span
                          className="flex items-center gap-0.5 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent"
                          title={`${v.editsMeta?.applied ?? 0} bloques aplicados${v.editsMeta?.bytes_saved ? ` · ${(v.editsMeta.bytes_saved / 1024).toFixed(1)} KB ahorrados` : ''}`}
                        >
                          <GitBranch className="h-2.5 w-2.5" />
                          diff · {v.editsMeta?.applied ?? 0}b
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <FileText className="h-2.5 w-2.5" />
                          full
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
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className="truncate text-[10px] text-muted-foreground">
                        {AI_MODEL_LABELS[v.model_used] || v.model_used} ·{' '}
                        {v.generated_files.length} archivos
                        {v.isDiff && v.editsMeta?.bytes_saved
                          ? ` · 💾 ${(v.editsMeta.bytes_saved / 1024).toFixed(1)} KB`
                          : ''}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => setPreviewing(v)}
                          title="Vista previa sin restaurar"
                        >
                          <Eye className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          disabled={restoringId === v.id || isCurrent}
                          onClick={() => handleRestore(v)}
                        >
                          <RotateCcw className="mr-1 h-2.5 w-2.5" />
                          {restoringId === v.id ? '…' : 'Restaurar'}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Modal de vista previa de versión histórica — sin tocar el builder */}
      {previewing && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewing(null)}
        >
          <div className="flex items-center gap-2 border-b border-border bg-card/95 px-4 py-2 shadow">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Vista previa — v{previewing.version_number}
            </span>
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
              solo lectura · no consume créditos
            </span>
            <Button
              size="sm"
              variant="default"
              className="ml-auto h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleRestore(previewing);
                setPreviewing(null);
              }}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Restaurar esta versión
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewing(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div
            className="flex-1 overflow-hidden p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              srcDoc={previewHtml}
              className="h-full w-full rounded-lg border border-border bg-white shadow-elevated"
              sandbox="allow-scripts allow-same-origin"
              title={`Preview v${previewing.version_number}`}
            />
          </div>
        </div>
      )}
    </>
  );
}
