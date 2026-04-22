import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBuilder } from '@/hooks/useBuilder';
import { ProjectHeader } from '@/components/builder/ProjectHeader';
import { FileTree } from '@/components/builder/FileTree';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { ChatPanel } from '@/components/builder/ChatPanel';
import { VersionHistory } from '@/components/builder/VersionHistory';
import { CommandPalette } from '@/components/builder/CommandPalette';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useBuilderStore } from '@/features/builder/builderStore';

export default function Builder() {
  const { projectId } = useParams<{ projectId: string }>();
  const { sidebarOpen, chatOpen } = useBuilder();
  const loadProject = useBuilderStore((s) => s.loadProject);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<'files' | 'content'>('files');
  useAutoSave();

  useEffect(() => {
    if (!projectId) return;
    // Hydrate project metadata + latest version files + chat history.
    // Without this, opening an existing project from the dashboard shows
    // an empty builder as if it were brand new.
    loadProject(projectId).catch((e) => {
      console.error('[builder] failed to load project', e);
    });
  }, [projectId, loadProject]);

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
      } else if (key === 's' && !e.shiftKey) {
        e.preventDefault();
        useBuilderStore.getState().saveVersion('manual').catch(() => {});
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
