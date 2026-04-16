import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBuilder } from '@/hooks/useBuilder';
import { ProjectHeader } from '@/components/builder/ProjectHeader';
import { FileTree } from '@/components/builder/FileTree';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { ChatPanel } from '@/components/builder/ChatPanel';

export default function Builder() {
  const { projectId } = useParams<{ projectId: string }>();
  const { sidebarOpen, chatOpen, reset } = useBuilder();

  useEffect(() => {
    if (projectId) reset(projectId);
  }, [projectId]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <ProjectHeader />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <FileTree />}
        <PreviewPanel />
        {chatOpen && <ChatPanel />}
      </div>
    </div>
  );
}
