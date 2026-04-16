import type { GeneratedFile } from '@/types';
import { Monitor, Code2 } from 'lucide-react';

interface Props {
  code: string;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  selectedFile: GeneratedFile | null;
}

const viewWidths = { desktop: '100%', tablet: '768px', mobile: '375px' };

export function BuilderPreview({ code, viewMode, selectedFile }: Props) {
  const hasContent = code || selectedFile;

  return (
    <div className="flex flex-1 flex-col bg-background">
      {hasContent ? (
        <div className="flex flex-1 items-center justify-center overflow-auto p-4">
          <div className="h-full overflow-auto rounded-lg border border-border/50 bg-card shadow-elevated transition-all"
            style={{ width: viewWidths[viewMode], maxWidth: '100%' }}>
            {selectedFile ? (
              <div className="p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Code2 className="h-4 w-4" />
                  <span className="font-mono">{selectedFile.path}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">{selectedFile.language}</span>
                </div>
                <pre className="overflow-x-auto rounded-md bg-muted p-4 font-mono text-xs leading-relaxed">
                  <code>{selectedFile.content}</code>
                </pre>
              </div>
            ) : code ? (
              <iframe srcDoc={code} className="h-full w-full" sandbox="allow-scripts" title="Preview" />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Monitor className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h2 className="mb-1 text-lg font-semibold text-muted-foreground">Live Preview</h2>
          <p className="text-sm text-muted-foreground/60">
            Escribe un prompt en el chat para generar tu app
          </p>
        </div>
      )}
    </div>
  );
}
