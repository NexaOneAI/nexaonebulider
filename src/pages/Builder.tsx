import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BuilderTopbar } from '@/components/builder/BuilderTopbar';
import { BuilderSidebar } from '@/components/builder/BuilderSidebar';
import { BuilderPreview } from '@/components/builder/BuilderPreview';
import { BuilderChat } from '@/components/builder/BuilderChat';
import type { GeneratedFile, AIMessage } from '@/types';

export default function Builder() {
  const { projectId } = useParams<{ projectId: string }>();
  const [projectName, setProjectName] = useState('Mi proyecto');
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [previewCode, setPreviewCode] = useState('');
  const [model, setModel] = useState('openai');
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="flex h-screen flex-col bg-background">
      <BuilderTopbar
        projectName={projectName}
        onNameChange={setProjectName}
        model={model}
        onModelChange={setModel}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen(!chatOpen)}
        projectId={projectId || ''}
        files={files}
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <BuilderSidebar files={files} selectedFile={selectedFile} onSelectFile={setSelectedFile} />
        )}

        <BuilderPreview code={previewCode} viewMode={viewMode} selectedFile={selectedFile} />

        {chatOpen && (
          <BuilderChat
            projectId={projectId || ''}
            model={model}
            messages={messages}
            setMessages={setMessages}
            onFilesGenerated={(newFiles, code) => {
              setFiles(newFiles);
              setPreviewCode(code);
              if (newFiles.length > 0) setSelectedFile(newFiles[0]);
            }}
          />
        )}
      </div>
    </div>
  );
}
