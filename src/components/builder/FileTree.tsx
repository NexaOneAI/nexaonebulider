import { FileCode2, Folder, ChevronRight, History, Eye } from 'lucide-react';
import { useBuilder } from '@/hooks/useBuilder';
import { useBuilderStore } from '@/features/builder/builderStore';
import { builderService } from '@/features/builder/builderService';
import { Button } from '@/components/ui/button';

export function FileTree() {
  const { files, selectedFile, setSelectedFile } = useBuilder();
  const setShowCode = useBuilderStore((s) => s.setShowCode);
  const tree = builderService.buildFileTree(files);

  const handleFileClick = (file: typeof files[0]) => {
    setSelectedFile(file);
    setShowCode(true);
  };

  return (
    <div className="flex w-60 flex-col border-r border-border/50 bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Folder className="h-4 w-4 text-sidebar-foreground" />
        <span className="text-sm font-medium text-sidebar-foreground">Archivos</span>
        <span className="ml-auto text-xs text-muted-foreground">{files.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <FileCode2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/50">Genera tu primera app</p>
          </div>
        ) : (
          <>
            {/* Show preview button */}
            <button
              onClick={() => {
                setSelectedFile(null);
                setShowCode(false);
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-primary transition-colors hover:bg-sidebar-accent/50"
            >
              <Eye className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium">Ver Preview</span>
            </button>
            <div className="mb-2 h-px bg-border/30" />

            {Object.entries(tree).map(([dir, dirFiles]) => (
              <div key={dir} className="mb-2">
                {dir !== '.' && (
                  <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
                    <ChevronRight className="h-3 w-3" />
                    <span>{dir}</span>
                  </div>
                )}
                {dirFiles.map((file, i) => (
                  <button
                    key={i}
                    onClick={() => handleFileClick(file)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                      selectedFile?.path === file.path
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-mono text-xs">{file.path.split('/').pop()}</span>
                  </button>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
