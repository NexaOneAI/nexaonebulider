import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelSelector } from './ModelSelector';
import { Save, Download, Rocket, History, PanelLeft, MessageSquare, Monitor, Tablet, Smartphone, Zap, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useBuilder } from '@/hooks/useBuilder';
import { useBuilderStore } from '@/features/builder/builderStore';
import { exportProjectZip } from '@/features/builder/zipExport';
import { useAuth } from '@/hooks/useAuth';

export function ProjectHeader() {
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info('Historial de versiones próximamente')}>
          <History className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info('Deploy próximamente')}>
          <Rocket className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${chatOpen ? 'text-primary' : ''}`} onClick={toggleChat}>
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
