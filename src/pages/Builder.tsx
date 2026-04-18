import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBuilder } from '@/hooks/useBuilder';
import { ProjectHeader } from '@/components/builder/ProjectHeader';
import { FileTree } from '@/components/builder/FileTree';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { ChatPanel } from '@/components/builder/ChatPanel';
import { VersionHistory } from '@/components/builder/VersionHistory';

export default function Builder() {
  const { projectId } = useParams<{ projectId: string }>();
  const { sidebarOpen, chatOpen, reset } = useBuilder();
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (projectId) reset(projectId);
  }, [projectId]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <ProjectHeader onToggleHistory={() => setHistoryOpen((o) => !o)} historyOpen={historyOpen} />
      <div className="relative flex flex-1 overflow-hidden">
        {sidebarOpen && <FileTree />}
        <PreviewPanel />
        {chatOpen && <ChatPanel />}
        <VersionHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />
      </div>
    </div>
  );
}
