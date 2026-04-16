import { useBuilder } from '@/hooks/useBuilder';
import { CodeEditor } from './CodeEditor';
import { Monitor } from 'lucide-react';
import { VIEW_WIDTHS } from '@/lib/constants';

export function PreviewPanel() {
  const { previewCode, viewMode, selectedFile } = useBuilder();
  const hasContent = previewCode || selectedFile;

  return (
    <div className="flex flex-1 flex-col bg-background">
      {hasContent ? (
        <div className="flex flex-1 items-start justify-center overflow-auto p-4">
          <div className="h-full w-full overflow-auto rounded-lg border border-border/50 bg-card shadow-elevated transition-all"
            style={{ maxWidth: VIEW_WIDTHS[viewMode] }}>
            {selectedFile ? (
              <CodeEditor file={selectedFile} />
            ) : previewCode ? (
              <iframe srcDoc={previewCode} className="h-full w-full min-h-[500px]" sandbox="allow-scripts" title="Preview" />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Monitor className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h2 className="mb-1 text-lg font-semibold text-muted-foreground">Live Preview</h2>
          <p className="text-sm text-muted-foreground/60">Escribe un prompt en el chat para generar tu app</p>
        </div>
      )}
    </div>
  );
}
