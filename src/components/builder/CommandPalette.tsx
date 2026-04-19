import { useEffect, useMemo, useState } from 'react';
import { FileCode2, Search, Hash } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { useBuilderStore } from '@/features/builder/builderStore';
import { searchContent, searchFilesByName } from '@/features/builder/searchService';
import type { GeneratedFile } from '@/features/projects/projectTypes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'files' = Cmd+P, 'content' = Cmd+Shift+F */
  initialMode?: 'files' | 'content';
}

export function CommandPalette({ open, onOpenChange, initialMode = 'files' }: Props) {
  const files = useBuilderStore((s) => s.files);
  const setSelectedFile = useBuilderStore((s) => s.setSelectedFile);
  const setShowCode = useBuilderStore((s) => s.setShowCode);
  const setHighlightLine = useBuilderStore((s) => s.setHighlightLine);

  const [mode, setMode] = useState<'files' | 'content'>(initialMode);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setQuery('');
    }
  }, [open, initialMode]);

  const fileResults = useMemo(
    () => (mode === 'files' ? searchFilesByName(query, files, 50) : []),
    [mode, query, files],
  );

  const contentResults = useMemo(
    () => (mode === 'content' && query.trim().length >= 2 ? searchContent(query, files, { limit: 100 }) : []),
    [mode, query, files],
  );

  const handlePickFile = (file: GeneratedFile, line?: number) => {
    setSelectedFile(file);
    setShowCode(true);
    setHighlightLine(line ?? null);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center gap-1 border-b border-border/50 px-2 pt-2">
        <Button
          size="sm"
          variant={mode === 'files' ? 'secondary' : 'ghost'}
          className="h-7 text-xs"
          onClick={() => setMode('files')}
        >
          <FileCode2 className="mr-1 h-3 w-3" />
          Archivos
          <kbd className="ml-2 rounded bg-muted px-1 text-[10px] text-muted-foreground">⌘P</kbd>
        </Button>
        <Button
          size="sm"
          variant={mode === 'content' ? 'secondary' : 'ghost'}
          className="h-7 text-xs"
          onClick={() => setMode('content')}
        >
          <Search className="mr-1 h-3 w-3" />
          Contenido
          <kbd className="ml-2 rounded bg-muted px-1 text-[10px] text-muted-foreground">⌘⇧F</kbd>
        </Button>
        <span className="ml-auto pr-2 text-[10px] text-muted-foreground">
          {files.length} archivo{files.length === 1 ? '' : 's'}
        </span>
      </div>

      <CommandInput
        placeholder={mode === 'files' ? 'Buscar archivo por nombre…' : 'Buscar texto en todos los archivos…'}
        value={query}
        onValueChange={setQuery}
      />

      <CommandList className="max-h-[400px]">
        {mode === 'files' ? (
          <>
            <CommandEmpty>No se encontraron archivos.</CommandEmpty>
            <CommandGroup heading="Archivos">
              {fileResults.map(({ file }) => {
                const basename = file.path.split('/').pop() || file.path;
                const dir = file.path.slice(0, file.path.length - basename.length).replace(/\/$/, '');
                return (
                  <CommandItem
                    key={file.path}
                    value={file.path}
                    onSelect={() => handlePickFile(file)}
                  >
                    <FileCode2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-sm">{basename}</span>
                    {dir && (
                      <span className="ml-2 truncate font-mono text-xs text-muted-foreground">{dir}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        ) : (
          <>
            <CommandEmpty>
              {query.trim().length < 2
                ? 'Escribe al menos 2 caracteres…'
                : 'No se encontraron coincidencias.'}
            </CommandEmpty>
            {contentResults.length > 0 && (
              <CommandGroup heading={`${contentResults.length} coincidencia(s)`}>
                {contentResults.map((m, i) => (
                  <CommandItem
                    key={`${m.file.path}:${m.line}:${m.column}:${i}`}
                    value={`${m.file.path}:${m.line}:${i}`}
                    onSelect={() => handlePickFile(m.file, m.line)}
                  >
                    <Hash className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {m.file.path}
                        </span>
                        <span className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                          L{m.line}:{m.column}
                        </span>
                      </div>
                      <code className="truncate font-mono text-xs text-foreground/80">
                        {m.preview.slice(0, m.highlight[0])}
                        <span className="rounded bg-primary/25 px-0.5 text-primary-foreground">
                          {m.preview.slice(m.highlight[0], m.highlight[1])}
                        </span>
                        {m.preview.slice(m.highlight[1])}
                      </code>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
