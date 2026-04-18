import { useEffect } from 'react';
import { useBuilder } from '@/hooks/useBuilder';
import { CodeEditor } from './CodeEditor';
import { Monitor, Code2, Eye } from 'lucide-react';
import { VIEW_WIDTHS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useBuilderStore } from '@/features/builder/builderStore';

export function PreviewPanel() {
  const { previewCode, viewMode, selectedFile, files } = useBuilder();
  const showCode = useBuilderStore((s) => s.showCode);
  const setShowCode = useBuilderStore((s) => s.setShowCode);
  const setSelectedFile = useBuilderStore((s) => s.setSelectedFile);
  const setPreviewError = useBuilderStore((s) => s.setPreviewError);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== 'lovable-preview') return;
      if (d.kind === 'preview-error') {
        setPreviewError({ message: d.message || '', stack: d.stack || '', at: Date.now() });
      } else if (d.kind === 'preview-ready') {
        setPreviewError(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setPreviewError]);

  const hasContent = previewCode || selectedFile;
  const showingCode = showCode && selectedFile;

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Toolbar */}
      {hasContent && (
        <div className="flex items-center gap-2 border-b border-border/50 bg-card/50 px-4 py-2">
          <Button
            variant={!showingCode ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setShowCode(false);
              setSelectedFile(null);
            }}
          >
            <Eye className="mr-1 h-3 w-3" />
            Preview
          </Button>
          <Button
            variant={showingCode ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              if (!selectedFile && files.length > 0) {
                setSelectedFile(files[0]);
              }
              setShowCode(true);
            }}
          >
            <Code2 className="mr-1 h-3 w-3" />
            Código
          </Button>
          {selectedFile && showingCode && (
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {selectedFile.path}
            </span>
          )}
        </div>
      )}

      {hasContent ? (
        <div className="flex min-h-0 flex-1 justify-center overflow-auto p-4">
          <div
            className="flex h-full min-h-[600px] w-full flex-col overflow-hidden rounded-lg border border-border/50 bg-card shadow-elevated transition-all"
            style={{ maxWidth: VIEW_WIDTHS[viewMode] }}
          >
            {showingCode && selectedFile ? (
              <CodeEditor file={selectedFile} />
            ) : previewCode ? (
              <iframe
                srcDoc={previewCode}
                className="h-full w-full flex-1"
                sandbox="allow-scripts allow-same-origin"
                title="Live Preview"
                style={{ border: 'none', background: 'white', display: 'block' }}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
            <Monitor className="h-10 w-10 text-primary/50" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Live Preview</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Escribe un prompt en el chat para generar tu app. La preview se actualizará en tiempo real.
          </p>
        </div>
      )}
    </div>
  );
}
