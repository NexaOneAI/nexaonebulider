import { FileCode2, Folder } from 'lucide-react';
import type { GeneratedFile } from '@/types';

interface Props {
  files: GeneratedFile[];
  selectedFile: GeneratedFile | null;
  onSelectFile: (file: GeneratedFile) => void;
}

export function BuilderSidebar({ files, selectedFile, onSelectFile }: Props) {
  return (
    <div className="flex w-60 flex-col border-r border-border/50 bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Folder className="h-4 w-4 text-sidebar-foreground" />
        <span className="text-sm font-medium text-sidebar-foreground">Archivos</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <FileCode2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/50">Genera tu primera app para ver los archivos</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {files.map((file, i) => (
              <button key={i} onClick={() => onSelectFile(file)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                  selectedFile?.path === file.path
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}>
                <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-mono text-xs">{file.path}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
