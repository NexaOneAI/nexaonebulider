import { Code2 } from 'lucide-react';
import type { GeneratedFile } from '@/features/projects/projectTypes';

interface Props {
  file: GeneratedFile;
}

export function CodeEditor({ file }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2 bg-card/50">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm text-muted-foreground">{file.path}</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">{file.language}</span>
      </div>
      <pre className="flex-1 overflow-auto bg-muted/30 p-4 font-mono text-xs leading-relaxed">
        <code>{file.content}</code>
      </pre>
    </div>
  );
}
