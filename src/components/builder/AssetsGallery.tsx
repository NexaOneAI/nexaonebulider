import { useEffect, useState } from 'react';
import { ImageIcon, Copy, Trash2, RefreshCw, X, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  listProjectAssets,
  deleteProjectAsset,
  type ProjectAsset,
} from '@/features/assets/assetsService';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function AssetsGallery({ open, onClose, projectId }: Props) {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await listProjectAssets(projectId);
      setAssets(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  if (!open) return null;

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copiada');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleDelete = async (asset: ProjectAsset) => {
    if (!window.confirm(`¿Borrar la imagen "${asset.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(asset.path);
    const res = await deleteProjectAsset(asset.path);
    setDeleting(null);
    if (res.ok) {
      setAssets((prev) => prev.filter((a) => a.path !== asset.path));
      toast.success('Imagen eliminada');
    } else {
      toast.error(res.error || 'Error al eliminar');
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-end bg-background/40 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-elevated animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
          <ImageIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Assets del proyecto</h2>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {assets.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7"
            onClick={load}
            disabled={loading}
            title="Recargar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Cerrar">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && assets.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15">
                <ImageIcon className="h-6 w-6 text-primary/60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Sin imágenes aún</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground/60">
                Pídele al chat "agrega una imagen de…" o usa el botón de imagen junto al prompt para generar una.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {assets.map((asset) => (
                <div
                  key={asset.path}
                  className="group relative overflow-hidden rounded-lg border border-border/50 bg-background/50"
                >
                  <div className="aspect-square w-full overflow-hidden bg-muted/30">
                    <img
                      src={asset.publicUrl}
                      alt={asset.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-1 p-2">
                    <p className="truncate font-mono text-[10px] text-muted-foreground" title={asset.name}>
                      {asset.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                      <span>{formatBytes(asset.size)}</span>
                      <span>{relativeTime(asset.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(asset.publicUrl)}
                        className="flex flex-1 items-center justify-center gap-1 rounded bg-secondary px-1.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                        title="Copiar URL pública"
                      >
                        <Copy className="h-2.5 w-2.5" />
                        URL
                      </button>
                      <a
                        href={asset.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center rounded bg-secondary px-1.5 py-1 text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(asset)}
                        disabled={deleting === asset.path}
                        className="flex items-center justify-center rounded bg-destructive/10 px-1.5 py-1 text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deleting === asset.path ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-2.5 w-2.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
