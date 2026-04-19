import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBuilder } from '@/hooks/useBuilder';
import { ProjectHeader } from '@/components/builder/ProjectHeader';
import { FileTree } from '@/components/builder/FileTree';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { ChatPanel } from '@/components/builder/ChatPanel';
import { VersionHistory } from '@/components/builder/VersionHistory';
import { CommandPalette } from '@/components/builder/CommandPalette';

export default function Builder() {
  const { projectId } = useParams<{ projectId: string }>();
  const { sidebarOpen, chatOpen, reset } = useBuilder();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<'files' | 'content'>('files');

  useEffect(() => {
    if (projectId) reset(projectId);
  }, [projectId]);

  // Global shortcuts: Cmd/Ctrl+P (files) and Cmd/Ctrl+Shift+F (content)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === 'p' && !e.shiftKey) {
        e.preventDefault();
        setPaletteMode('files');
        setPaletteOpen(true);
      } else if (key === 'f' && e.shiftKey) {
        e.preventDefault();
        setPaletteMode('content');
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      <ProjectHeader onToggleHistory={() => setHistoryOpen((o) => !o)} historyOpen={historyOpen} />
      <div className="relative flex flex-1 overflow-hidden">
        {sidebarOpen && <FileTree />}
        <PreviewPanel />
        {chatOpen && <ChatPanel />}
        <VersionHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          initialMode={paletteMode}
        />
      </div>
    </div>
  );
}
