import { Code2, Copy, Check, Pencil, Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GeneratedFile } from '@/features/projects/projectTypes';
import { Button } from '@/components/ui/button';
import { useBuilderStore } from '@/features/builder/builderStore';

interface Props {
  file: GeneratedFile;
  /** 1-indexed line number to scroll to and highlight */
  highlightLine?: number;
}

export function CodeEditor({ file, highlightLine }: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const updateFileContent = useBuilderStore((s) => s.updateFileContent);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = file.content.split('\n');

  useEffect(() => {
    if (!highlightLine) return;
    const row = rowRefs.current.get(highlightLine);
    if (row) {
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [highlightLine, file.path]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2 bg-card/50">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm text-muted-foreground">{file.path}</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
          {file.language}
        </span>
        {highlightLine && (
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
            L{highlightLine}
          </span>
        )}
        <Button
          variant={editing ? 'default' : 'ghost'}
          size="sm"
          className="ml-auto h-7 text-xs"
          onClick={() => setEditing((v) => !v)}
          title={editing ? 'Salir de edición (cambios ya guardados)' : 'Editar archivo (HMR en WebContainer)'}
        >
          {editing ? <Eye className="mr-1 h-3 w-3" /> : <Pencil className="mr-1 h-3 w-3" />}
          {editing ? 'Ver' : 'Editar'}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {editing ? (
        <textarea
          value={file.content}
          onChange={(e) => updateFileContent(file.path, e.target.value)}
          spellCheck={false}
          className="flex-1 resize-none overflow-auto bg-muted/20 p-4 font-mono text-xs leading-6 text-foreground/90 outline-none focus:bg-muted/10"
          style={{ tabSize: 2 }}
        />
      ) : (
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/20">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => {
              const lineNum = i + 1;
              const isHighlighted = highlightLine === lineNum;
              return (
                <tr
                  key={i}
                  ref={(el) => {
                    if (el) rowRefs.current.set(lineNum, el);
                    else rowRefs.current.delete(lineNum);
                  }}
                  className={
                    isHighlighted
                      ? 'bg-primary/15 outline outline-1 outline-primary/40'
                      : 'hover:bg-muted/30'
                  }
                >
                  <td className="select-none border-r border-border/30 px-3 py-0 text-right font-mono text-xs text-muted-foreground/40 align-top w-12">
                    {lineNum}
                  </td>
                  <td className="px-4 py-0 font-mono text-xs leading-6 whitespace-pre text-foreground/90">
                    {line || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
