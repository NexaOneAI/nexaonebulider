import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Download, Rocket, History, PanelLeft, MessageSquare, Monitor, Tablet, Smartphone, Zap, ChevronLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import JSZip from 'jszip';
import type { GeneratedFile } from '@/types';

interface Props {
  projectName: string;
  onNameChange: (name: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  onViewModeChange: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  projectId: string;
  files: GeneratedFile[];
}

export function BuilderTopbar({ projectName, onNameChange, model, onModelChange, viewMode, onViewModeChange, sidebarOpen, onToggleSidebar, chatOpen, onToggleChat, files }: Props) {
  const navigate = useNavigate();

  const handleExportZip = async () => {
    if (files.length === 0) {
      toast.error('No hay archivos para exportar');
      return;
    }
    const zip = new JSZip();
    files.forEach((f) => zip.file(f.path, f.content));
    zip.file('package.json', JSON.stringify({ name: projectName.toLowerCase().replace(/\s+/g, '-'), version: '1.0.0', private: true, type: 'module', scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' }, dependencies: { react: '^18.3.0', 'react-dom': '^18.3.0' }, devDependencies: { vite: '^5.0.0', '@vitejs/plugin-react': '^4.0.0', typescript: '^5.0.0' } }, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Proyecto exportado');
  };

  return (
    <div className="flex h-12 items-center justify-between border-b border-border/50 bg-card/80 px-3 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/dashboard')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleSidebar}>
          <PanelLeft className={`h-4 w-4 ${sidebarOpen ? 'text-primary' : ''}`} />
        </Button>
        <div className="mx-2 h-5 w-px bg-border" />
        <Input value={projectName} onChange={(e) => onNameChange(e.target.value)}
          className="h-8 w-48 border-none bg-transparent px-2 text-sm font-medium focus-visible:ring-1" />
      </div>

      <div className="flex items-center gap-1">
        {[
          { mode: 'desktop' as const, icon: Monitor },
          { mode: 'tablet' as const, icon: Tablet },
          { mode: 'mobile' as const, icon: Smartphone },
        ].map(({ mode, icon: Icon }) => (
          <Button key={mode} variant="ghost" size="icon" className={`h-8 w-8 ${viewMode === mode ? 'text-primary' : ''}`}
            onClick={() => onViewModeChange(mode)}>
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="claude">Claude</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium">--</span>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info('Guardando...')}>
          <Save className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info('Historial de versiones')}>
          <History className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExportZip}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info('Deploy próximamente')}>
          <Rocket className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${chatOpen ? 'text-primary' : ''}`} onClick={onToggleChat}>
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
