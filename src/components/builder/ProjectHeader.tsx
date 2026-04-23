import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelSelector } from './ModelSelector';
import { Save, Download, Rocket, History, PanelLeft, MessageSquare, Monitor, Tablet, Smartphone, Zap, ChevronLeft, Share2, Image as ImageIcon, Boxes, Brain, GitBranch as GithubIcon, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useBuilder } from '@/hooks/useBuilder';
import { useBuilderStore } from '@/features/builder/builderStore';
import { exportProjectZip } from '@/features/builder/zipExport';
import { useAuth } from '@/hooks/useAuth';
import { ShareDialog } from '@/components/sharing/ShareDialog';
import { AssetsGallery } from './AssetsGallery';
import { KnowledgeDialog } from './KnowledgeDialog';
import { DeployDialog } from './DeployDialog';
import { GithubDialog } from './GithubDialog';
import { useGithubStore } from '@/features/github/githubStore';
import { safe } from '@/lib/utils';
import {
  getSandbox,
  setSandbox,
  subscribeSandbox,
  isWebContainersAvailable,
  type SandboxKind,
} from '@/features/builder/sandboxPrefs';
import { useEffect } from 'react';

interface Props {
  onToggleHistory?: () => void;
  historyOpen?: boolean;
}

export function ProjectHeader({ onToggleHistory, historyOpen }: Props = {}) {
  const navigate = useNavigate();
  const auth = useAuth();
  const profile = auth?.profile ?? null;
  const {
    projectName, setProjectName, model, setModel,
    viewMode, setViewMode, sidebarOpen, toggleSidebar,
    chatOpen, toggleChat, files,
  } = useBuilder();
  const creditsRemaining = useBuilderStore((s) => s.creditsRemaining);
  const dirty = useBuilderStore((s) => s.dirty);
  const saveStatus = useBuilderStore((s) => s.saveStatus);
  const lastSavedAt = useBuilderStore((s) => s.lastSavedAt);
  const saveVersion = useBuilderStore((s) => s.saveVersion);

  const profileCredits = safe<number>(profile, 'credits', null);
  const displayCredits =
    typeof creditsRemaining === 'number' && creditsRemaining >= 0
      ? creditsRemaining
      : (profileCredits ?? '--');

  const projectId = useBuilderStore((s) => s.projectId);
  const [shareOpen, setShareOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const githubStatus = useGithubStore((s) => s.byProject[projectId]);
  const refreshGithub = useGithubStore((s) => s.refresh);
  const githubPushing = useGithubStore((s) => s.pushing[projectId] ?? false);

  useEffect(() => {
    if (projectId) refreshGithub(projectId).catch(() => {});
  }, [projectId, refreshGithub]);
  const [sandbox, setSandboxState] = useState<SandboxKind>(() => getSandbox(projectId));

  useEffect(() => {
    setSandboxState(getSandbox(projectId));
    return subscribeSandbox(() => setSandboxState(getSandbox(projectId)));
  }, [projectId]);

  const toggleSandbox = () => {
    if (!projectId) {
      toast.info('Abre un proyecto primero');
      return;
    }
    const wcEnabled = profile?.webcontainers_enabled === true;
    // Cycle: iframe → sandpack → (webcontainer if flag) → iframe
    let next: SandboxKind;
    if (sandbox === 'iframe') next = 'sandpack';
    else if (sandbox === 'sandpack' && wcEnabled) next = 'webcontainer';
    else next = 'iframe';

    if (next === 'webcontainer' && !isWebContainersAvailable()) {
      toast.error('WebContainers requiere COOP/COEP. Recarga /builder y reintenta.');
      next = 'iframe';
    }
    setSandbox(projectId, next);
    setSandboxState(next);
    const labels: Record<SandboxKind, string> = {
      iframe: 'iframe rápido (Sucrase + esm.sh)',
      sandpack: 'Sandpack activado · HMR + URL bar + router',
      webcontainer: 'WebContainer · Node.js + npm + Vite real',
    };
    toast.success(labels[next]);
  };

  const handleExport = async () => {
    if (files.length === 0) { toast.error('No hay archivos para exportar'); return; }
    const tid = toast.loading('Generando ZIP en el servidor...');
    try {
      await exportProjectZip(projectName, files, projectId);
      toast.success('ZIP descargado', { id: tid });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar', { id: tid });
    }
  };

  const handleSave = () => {
    if (files.length === 0) { toast.info('Genera una app primero'); return; }
    saveVersion('manual').catch(() => {});
  };

  const saveTooltip = (() => {
    if (saveStatus === 'saving') return 'Guardando…';
    if (saveStatus === 'error') return 'Error al guardar — click para reintentar';
    if (dirty) return 'Hay cambios sin guardar — click para crear versión (⌘S)';
    if (lastSavedAt) {
      const ts = new Date(lastSavedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      return `Guardado a las ${ts} (⌘S)`;
    }
    return 'Guardar versión (⌘S)';
  })();

  return (
    <div className="flex h-12 items-center justify-between border-b border-border/50 bg-card/80 px-3 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/dashboard')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${sidebarOpen ? 'text-primary' : ''}`} onClick={toggleSidebar}>
          <PanelLeft className="h-4 w-4" />
        </Button>
        <div className="mx-2 h-5 w-px bg-border" />
        <Input value={projectName} onChange={(e) => setProjectName(e.target.value)}
          className="h-8 w-48 border-none bg-transparent px-2 text-sm font-medium focus-visible:ring-1" />
      </div>

      <div className="flex items-center gap-1">
        {([
          ['desktop', Monitor],
          ['tablet', Tablet],
          ['mobile', Smartphone],
        ] as const).map(([mode, Icon]) => (
          <Button key={mode} variant="ghost" size="icon"
            className={`h-8 w-8 ${viewMode === mode ? 'text-primary' : ''}`}
            onClick={() => setViewMode(mode)}>
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <ModelSelector value={model} onChange={setModel} />
        <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium">{displayCredits}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          title={saveTooltip}
        >
          {saveStatus === 'saving' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveStatus === 'saved' && !dirty ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Save className={`h-4 w-4 ${dirty ? 'text-warning' : ''}`} />
          )}
          {dirty && saveStatus !== 'saving' && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-warning ring-2 ring-card" />
          )}
          {saveStatus === 'error' && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-card" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${historyOpen ? 'text-primary' : ''}`}
          onClick={onToggleHistory}
          title="Historial de versiones"
        >
          <History className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport} title="Exportar ZIP">
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (!projectId) { toast.info('Abre un proyecto primero'); return; }
            setAssetsOpen(true);
          }}
          title="Assets del proyecto (imágenes generadas)"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (!projectId) { toast.info('Guarda el proyecto primero'); return; }
            if (files.length === 0) { toast.info('Genera una app primero'); return; }
            setShareOpen(true);
          }}
          title="Compartir link público"
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`relative h-8 w-8 ${sandbox !== 'iframe' ? 'text-primary' : ''}`}
          onClick={toggleSandbox}
          title={
            sandbox === 'webcontainer'
              ? 'Sandbox: WebContainer (Node real). Click para volver a iframe.'
              : sandbox === 'sandpack'
              ? 'Sandbox: Sandpack (HMR + router). Click para WebContainer o iframe.'
              : 'Sandbox: iframe rápido. Click para activar Sandpack.'
          }
        >
          <Boxes className="h-4 w-4" />
          <span
            className={`absolute -bottom-0.5 -right-0.5 rounded px-1 text-[8px] font-bold leading-tight ${
              sandbox === 'webcontainer'
                ? 'bg-accent text-accent-foreground'
                : sandbox === 'sandpack'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {sandbox === 'webcontainer' ? 'WC' : sandbox === 'sandpack' ? 'SP' : 'IF'}
          </span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (!projectId) { toast.info('Abre un proyecto primero'); return; }
            setKnowledgeOpen(true);
          }}
          title="Knowledge: instrucciones persistentes que la IA aplicará en cada prompt"
        >
          <Brain className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`relative h-8 w-8 ${githubStatus?.repo ? 'text-primary' : ''}`}
          onClick={() => {
            if (!projectId) { toast.info('Abre un proyecto primero'); return; }
            setGithubOpen(true);
          }}
          title={
            githubStatus?.repo
              ? `GitHub: ${githubStatus.repo.owner}/${githubStatus.repo.repo}${githubStatus.repo.auto_push ? ' · auto-push ON' : ''}`
              : 'Conectar GitHub y sincronizar repo'
          }
        >
          {githubPushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GithubIcon className="h-4 w-4" />}
          {githubStatus?.repo?.last_push_error && (
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (!projectId) { toast.info('Abre un proyecto primero'); return; }
            if (files.length === 0) { toast.info('Genera una app primero'); return; }
            setDeployOpen(true);
          }}
          title="Desplegar a producción (Netlify)"
        >
          <Rocket className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${chatOpen ? 'text-primary' : ''}`} onClick={toggleChat}>
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>

      {projectId && (
        <>
          <ShareDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            projectId={projectId}
            projectName={projectName}
          />
          <AssetsGallery
            open={assetsOpen}
            onClose={() => setAssetsOpen(false)}
            projectId={projectId}
          />
          <KnowledgeDialog
            open={knowledgeOpen}
            onClose={() => setKnowledgeOpen(false)}
            projectId={projectId}
          />
          <DeployDialog
            open={deployOpen}
            onClose={() => setDeployOpen(false)}
            projectId={projectId}
            projectName={projectName}
            files={files}
          />
          <GithubDialog
            open={githubOpen}
            onClose={() => setGithubOpen(false)}
            projectId={projectId}
            projectName={projectName}
            files={files}
          />
        </>
      )}
    </div>
  );
}
