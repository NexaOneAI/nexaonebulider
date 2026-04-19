import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader } from '@/components/ui/Loader';
import { Copy, ExternalLink, RefreshCw, Trash2, Eye, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  sharesService,
  buildShareUrl,
  type ProjectShare,
} from '@/features/sharing/sharesService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

export function ShareDialog({ open, onOpenChange, projectId, projectName }: Props) {
  const [share, setShare] = useState<ProjectShare | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    setLoading(true);
    sharesService
      .get(projectId)
      .then((s) => {
        if (!cancelled) setShare(s);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const s = await sharesService.createOrGet(projectId);
      setShare(s);
      toast.success('Link público creado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!share) return;
    setBusy(true);
    try {
      await sharesService.setEnabled(share.id, enabled);
      setShare({ ...share, enabled });
      toast.success(enabled ? 'Link activado' : 'Link pausado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const handleRotate = async () => {
    if (!share) return;
    if (!confirm('¿Generar un nuevo token? El link actual dejará de funcionar.')) return;
    setBusy(true);
    try {
      const next = await sharesService.rotateToken(share.id);
      setShare(next);
      toast.success('Token regenerado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!share) return;
    if (!confirm('¿Eliminar este link público? No se puede deshacer.')) return;
    setBusy(true);
    try {
      await sharesService.remove(share.id);
      setShare(null);
      toast.success('Link eliminado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const url = share ? buildShareUrl(share.token) : '';

  const handleCopy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" />
            Compartir “{projectName}”
          </DialogTitle>
          <DialogDescription>
            Genera un link público de solo lectura para que otros vean el preview.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : !share ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no hay link público para este proyecto.
            </p>
            <Button onClick={handleCreate} disabled={busy}>
              {busy ? 'Creando...' : 'Crear link público'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={url} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                title="Copiar"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                title="Abrir"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  {share.enabled ? 'Link activo' : 'Link pausado'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Quien tenga el link puede ver el preview.
                </p>
              </div>
              <Switch
                checked={share.enabled}
                onCheckedChange={handleToggle}
                disabled={busy}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {share.view_count} {share.view_count === 1 ? 'vista' : 'vistas'}
              </span>
              {share.last_viewed_at && (
                <span>
                  Última: {new Date(share.last_viewed_at).toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex justify-between border-t border-border/50 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={busy}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Eliminar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
                disabled={busy}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Regenerar token
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
