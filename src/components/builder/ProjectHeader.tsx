import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelSelector } from './ModelSelector';
import { Save, Download, Rocket, History, PanelLeft, MessageSquare, Monitor, Tablet, Smartphone, Zap, ChevronLeft, Share2, Image as ImageIcon, Boxes, Brain, Github as GithubIcon } from 'lucide-react';
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
import {
  getSandbox,
  setSandbox,
  subscribeSandbox,
  type SandboxKind,
} from '@/features/builder/sandboxPrefs';
import { useEffect } from 'react';

interface Props {
  onToggleHistory?: () => void;
  historyOpen?: boolean;
}

export function ProjectHeader({ onToggleHistory, historyOpen }: Props = {}) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    projectName, setProjectName, model, setModel,
    viewMode, setViewMode, sidebarOpen, toggleSidebar,
    chatOpen, toggleChat, files,
  } = useBuilder();
  const creditsRemaining = useBuilderStore((s) => s.creditsRemaining);

  const displayCredits = creditsRemaining >= 0
    ? creditsRemaining
    : profile?.credits ?? '--';

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
    const next: SandboxKind = sandbox === 'iframe' ? 'sandpack' : 'iframe';
    setSandbox(projectId, next);
    setSandboxState(next);
    toast.success(
      next === 'sandpack'
        ? 'Sandpack activado · HMR + URL bar + router'
        : 'iframe rápido (Sucrase + esm.sh)',
    );
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
    toast.success('Versión guardada automáticamente');
  };

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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave}>
          <Save className="h-4 w-4" />
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
          className={`h-8 w-8 ${sandbox === 'sandpack' ? 'text-primary' : ''}`}
          onClick={toggleSandbox}
          title={
            sandbox === 'sandpack'
              ? 'Sandbox: Sandpack (HMR + router). Click para volver a iframe rápido.'
              : 'Sandbox: iframe rápido. Click para activar Sandpack (HMR + router).'
          }
        >
          <Boxes className="h-4 w-4" />
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
        </>
      )}
    </div>
  );
}
