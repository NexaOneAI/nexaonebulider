/**
 * GitHub dialog — tabs:
 *   • Conectar  → OAuth popup if not connected; "disconnect" if connected.
 *   • Crear repo → create new GH repo + push initial scaffold.
 *   • Linkear   → link an existing repo (owner/name) and push.
 *   • Settings  → toggle auto_push, manual push, unlink, open in GitHub.
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader } from '@/components/ui/Loader';
import { Github as GithubIcon, ExternalLink, RefreshCw, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  githubService,
  openGithubOAuthPopup,
  type GeneratedFile,
} from '@/features/github/githubService';
import { useGithubStore } from '@/features/github/githubStore';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  files: GeneratedFile[];
}

export function GithubDialog({ open, onClose, projectId, projectName, files }: Props) {
  const status = useGithubStore((s) => s.byProject[projectId]);
  const refresh = useGithubStore((s) => s.refresh);
  const pushing = useGithubStore((s) => s.pushing[projectId] ?? false);
  const setPushing = useGithubStore((s) => s.setPushing);

  const [connecting, setConnecting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);
  const [linkInput, setLinkInput] = useState(''); // owner/repo or full URL
  const [linkBranch, setLinkBranch] = useState('');

  useEffect(() => {
    if (open && projectId) {
      refresh(projectId).catch(() => {
        toast.error('No se pudo cargar el estado de GitHub');
      });
    }
  }, [open, projectId, refresh]);

  useEffect(() => {
    if (open && !newRepoName) {
      setNewRepoName(slugify(projectName));
    }
  }, [open, projectName, newRepoName]);

  const connected = !!status?.connected;
  const linked = !!status?.repo;

  // ---- handlers ----
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await openGithubOAuthPopup(window.location.href);
      if (result === 'ok') {
        toast.success('GitHub conectado');
        await refresh(projectId);
      } else if (result === 'error') {
        toast.error('No se pudo abrir GitHub. ¿Bloquea popups?');
      } else {
        await refresh(projectId);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await githubService.disconnect();
      toast.success('GitHub desconectado');
      await refresh(projectId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleCreate = async () => {
    if (!newRepoName.trim()) {
      toast.error('Ingresa un nombre de repo');
      return;
    }
    if (files.length === 0) {
      toast.error('Genera una app primero');
      return;
    }
    setCreating(true);
    const tid = toast.loading(`Creando ${newRepoName}…`);
    try {
      const r = await githubService.createRepo({
        projectId,
        name: newRepoName.trim(),
        private: newRepoPrivate,
        files,
      });
      toast.success(`Repo creado: ${r.repo.owner}/${r.repo.repo}`, { id: tid });
      await refresh(projectId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error', { id: tid });
    } finally {
      setCreating(false);
    }
  };

  const handleLink = async () => {
    const parsed = parseRepoInput(linkInput, status?.github_login || '');
    if (!parsed) {
      toast.error('Formato inválido. Usa owner/repo o la URL del repo.');
      return;
    }
    if (files.length === 0) {
      toast.error('Genera una app primero');
      return;
    }
    setLinking(true);
    const tid = toast.loading(`Linkeando ${parsed.owner}/${parsed.repo}…`);
    try {
      await githubService.linkRepo({
        projectId,
        owner: parsed.owner,
        repo: parsed.repo,
        branch: linkBranch.trim() || undefined,
        files,
      });
      toast.success('Repo vinculado y empujado', { id: tid });
      await refresh(projectId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error', { id: tid });
    } finally {
      setLinking(false);
    }
  };

  const handleManualPush = async () => {
    if (!status?.repo) return;
    setPushing(projectId, true);
    const tid = toast.loading('Subiendo cambios a GitHub…');
    try {
      const r = await githubService.push({
        projectId,
        files,
        message: `Manual sync from Nexa One Builder`,
      });
      toast.success(`Push ok · ${r.commit_sha.slice(0, 7)}`, { id: tid });
      await refresh(projectId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error', { id: tid });
    } finally {
      setPushing(projectId, false);
    }
  };

  const handleAutoPushToggle = async (v: boolean) => {
    try {
      await githubService.setAutoPush(projectId, v);
      await refresh(projectId);
      toast.success(v ? 'Auto-push activado' : 'Auto-push desactivado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleUnlink = async () => {
    try {
      await githubService.unlink(projectId);
      toast.success('Repo desvinculado del proyecto');
      await refresh(projectId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const defaultTab = !connected ? 'connect' : linked ? 'settings' : 'create';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-4 w-4" />
            GitHub Sync
          </DialogTitle>
          <DialogDescription>
            Conecta tu cuenta y sube cambios automáticamente en cada nueva versión.
          </DialogDescription>
        </DialogHeader>

        {!status ? (
          <div className="flex h-32 items-center justify-center">
            <Loader />
          </div>
        ) : (
          <Tabs defaultValue={defaultTab} key={`${connected}-${linked}`}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="connect">Cuenta</TabsTrigger>
              <TabsTrigger value="create" disabled={!connected || linked}>Crear</TabsTrigger>
              <TabsTrigger value="link" disabled={!connected || linked}>Linkear</TabsTrigger>
              <TabsTrigger value="settings" disabled={!linked}>Settings</TabsTrigger>
            </TabsList>

            {/* ---- Connect ---- */}
            <TabsContent value="connect" className="space-y-3 pt-3">
              {connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                    {status.avatar_url && (
                      <img
                        src={status.avatar_url}
                        alt={status.github_login || ''}
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">@{status.github_login}</div>
                      <div className="text-xs text-muted-foreground">
                        Scopes: {status.scope || 'repo, user'}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleDisconnect}>
                    Desconectar cuenta
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Conecta tu cuenta GitHub para crear repos automáticamente y subir cambios
                    en cada versión.
                  </p>
                  <Button onClick={handleConnect} disabled={connecting} className="w-full gap-2">
                    <Github className="h-4 w-4" />
                    {connecting ? 'Esperando autorización…' : 'Conectar con GitHub'}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ---- Create ---- */}
            <TabsContent value="create" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label htmlFor="repo-name">Nombre del repo</Label>
                <Input
                  id="repo-name"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="mi-app-genial"
                />
                <p className="text-xs text-muted-foreground">
                  Se creará en{' '}
                  <code className="text-foreground">
                    @{status.github_login}/{slugify(newRepoName) || '...'}
                  </code>
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div>
                  <div className="text-sm font-medium">Repo privado</div>
                  <div className="text-xs text-muted-foreground">
                    Solo visible para ti. Recomendado.
                  </div>
                </div>
                <Switch checked={newRepoPrivate} onCheckedChange={setNewRepoPrivate} />
              </div>
              <Button
                onClick={handleCreate}
                disabled={creating || !newRepoName.trim() || files.length === 0}
                className="w-full"
              >
                {creating ? 'Creando y subiendo…' : 'Crear repo + push inicial'}
              </Button>
            </TabsContent>

            {/* ---- Link ---- */}
            <TabsContent value="link" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label>Repo existente</Label>
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="owner/repo o https://github.com/owner/repo"
                />
              </div>
              <div className="space-y-2">
                <Label>Branch (opcional)</Label>
                <Input
                  value={linkBranch}
                  onChange={(e) => setLinkBranch(e.target.value)}
                  placeholder="main (default del repo si lo dejas vacío)"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Esto va a sobrescribir el contenido del branch con los archivos de este
                proyecto. Asegúrate de tener un repo vacío o un branch nuevo.
              </p>
              <Button
                onClick={handleLink}
                disabled={linking || !linkInput.trim() || files.length === 0}
                className="w-full"
              >
                {linking ? 'Linkeando…' : 'Linkear y push'}
              </Button>
            </TabsContent>

            {/* ---- Settings ---- */}
            <TabsContent value="settings" className="space-y-3 pt-3">
              {status.repo && (
                <>
                  <div className="rounded-lg border border-border/50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {status.repo.owner}/{status.repo.repo}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          branch: {status.repo.branch} ·{' '}
                          {status.repo.is_private ? 'privado' : 'público'}
                        </div>
                      </div>
                      {status.repo.html_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                          title="Abrir en GitHub"
                        >
                          <a href={status.repo.html_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                    {status.repo.last_pushed_at && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Último push:{' '}
                        {new Date(status.repo.last_pushed_at).toLocaleString()}
                        {status.repo.last_pushed_sha && (
                          <> · {status.repo.last_pushed_sha.slice(0, 7)}</>
                        )}
                      </div>
                    )}
                    {status.repo.last_push_error && (
                      <div className="mt-2 break-all rounded bg-destructive/10 p-2 text-xs text-destructive">
                        ⚠️ Último push falló: {status.repo.last_push_error}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div>
                      <div className="text-sm font-medium">Auto-push en cada versión</div>
                      <div className="text-xs text-muted-foreground">
                        Sube un commit cada vez que la IA o un visual edit genera una nueva
                        versión.
                      </div>
                    </div>
                    <Switch
                      checked={status.repo.auto_push}
                      onCheckedChange={handleAutoPushToggle}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      onClick={handleManualPush}
                      disabled={pushing || files.length === 0}
                      className="gap-2"
                    >
                      {pushing ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Push ahora
                    </Button>
                    <Button variant="outline" onClick={handleUnlink} className="gap-2">
                      <Trash2 className="h-3.5 w-3.5" />
                      Desvincular
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- helpers ---
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) || ''
  );
}

function parseRepoInput(
  input: string,
  fallbackOwner: string,
): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // URL form
  const urlMatch = trimmed.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/|$)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  // owner/repo
  const slashMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };
  // bare repo name → use connected user as owner
  if (fallbackOwner && /^[\w.-]+$/.test(trimmed)) {
    return { owner: fallbackOwner, repo: trimmed };
  }
  return null;
}
