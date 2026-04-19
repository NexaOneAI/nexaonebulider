import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, ExternalLink, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deployToNetlify,
  listDeployments,
  type Deployment,
} from '@/features/deploy/deployService';
import type { GeneratedFile } from '@/features/projects/projectTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  files: GeneratedFile[];
}

export function DeployDialog({ open, onClose, projectId, projectName, files }: Props) {
  const [history, setHistory] = useState<Deployment[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const list = await listDeployments(projectId);
      setHistory(list);
    } catch (e) {
      // No mostramos error si solo falla la lectura del historial
      console.warn('Failed to load deployments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) loadHistory();
  }, [open, projectId]);

  const lastLive = history.find((d) => d.status === 'live' && d.site_id);

  const handleDeploy = async () => {
    if (files.length === 0) {
      toast.error('No hay archivos que desplegar');
      return;
    }
    setDeploying(true);
    const tid = toast.loading('Desplegando a Netlify… (~30s)');
    try {
      const res = await deployToNetlify(projectId, projectName, files, lastLive?.site_id);
      toast.success('¡Desplegado!', { id: tid, description: res.url });
      await loadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Deploy falló', { id: tid });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Deploy a producción
          </DialogTitle>
          <DialogDescription>
            Publica tu app en un dominio público de Netlify. Necesitas un
            <code className="mx-1 rounded bg-muted px-1 text-xs">NETLIFY_AUTH_TOKEN</code>
            configurado en los secretos del proyecto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {lastLive && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary" /> Último deploy en vivo
              </div>
              <a
                href={lastLive.url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {lastLive.url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <Button
            onClick={handleDeploy}
            disabled={deploying || files.length === 0}
            className="w-full"
          >
            {deploying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Desplegando…
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                {lastLive ? 'Re-desplegar (mismo sitio)' : 'Desplegar nuevo sitio'}
              </>
            )}
          </Button>

          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Historial
            </h4>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin despliegues aún.</p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {history.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded border border-border/40 bg-muted/30 px-2 py-1.5 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {d.status === 'live' && (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" />
                      )}
                      {d.status === 'failed' && (
                        <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
                      )}
                      {(d.status === 'pending' || d.status === 'building') && (
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                      )}
                      {d.url ? (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-primary hover:underline"
                        >
                          {d.url}
                        </a>
                      ) : (
                        <span className="truncate text-muted-foreground">
                          {d.error_message || '(sin URL)'}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                      {d.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
