import { useMemo, useState } from 'react';
import { X, FilePlus2, FileMinus2, FileDiff as FileDiffIcon, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { computeDiff, type FileDiff } from '@/features/projects/versionDiffService';
import type { GeneratedFile } from '@/features/projects/projectTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  fromLabel: string;
  toLabel: string;
  fromFiles: GeneratedFile[];
  toFiles: GeneratedFile[];
}

const STATUS_META = {
  added: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', Icon: FilePlus2, label: 'nuevo' },
  removed: { color: 'text-red-500', bg: 'bg-red-500/10', Icon: FileMinus2, label: 'borrado' },
  modified: { color: 'text-amber-500', bg: 'bg-amber-500/10', Icon: FileDiffIcon, label: 'modificado' },
  unchanged: { color: 'text-muted-foreground', bg: 'bg-muted/20', Icon: FileDiffIcon, label: 'sin cambios' },
} as const;

function DiffLines({ file }: { file: FileDiff }) {
  if (file.status === 'unchanged' || file.changes.length === 0) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Sin cambios.</div>;
  }
  return (
    <pre className="overflow-x-auto bg-background/40 px-3 py-2 text-[11px] leading-relaxed font-mono">
      {file.changes.map((chunk, i) => {
        const lines = chunk.value.replace(/\n$/, '').split('\n');
        return lines.map((ln, j) => {
          const sign = chunk.added ? '+' : chunk.removed ? '-' : ' ';
          const cls = chunk.added
            ? 'bg-emerald-500/10 text-emerald-300'
            : chunk.removed
              ? 'bg-red-500/10 text-red-300'
              : 'text-muted-foreground/70';
          return (
            <div key={`${i}-${j}`} className={`${cls} whitespace-pre`}>
              <span className="select-none pr-2 opacity-60">{sign}</span>
              {ln || ' '}
            </div>
          );
        });
      })}
    </pre>
  );
}

export function VersionDiffModal({
  open,
  onClose,
  fromLabel,
  toLabel,
  fromFiles,
  toFiles,
}: Props) {
  const summary = useMemo(
    () => (open ? computeDiff(fromFiles, toFiles) : null),
    [open, fromFiles, toFiles],
  );
  const [selected, setSelected] = useState<string | null>(null);

  if (!open || !summary) return null;

  const activePath = selected ?? summary.files[0]?.path ?? null;
  const activeFile = summary.files.find((f) => f.path === activePath) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/85 backdrop-blur-sm animate-in fade-in">
      <div className="flex items-center gap-3 border-b border-border bg-card/95 px-4 py-2">
        <FileDiffIcon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Comparar versiones</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5">{fromLabel}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary">{toLabel}</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px]">
          <span className="text-emerald-500">+{summary.totals.added}</span>
          <span className="text-red-500">−{summary.totals.removed}</span>
          <span className="text-muted-foreground">
            {summary.totals.filesChanged} archivos
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border/50 bg-card/40">
          {summary.files.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground">Sin diferencias.</div>
          ) : (
            <ul className="divide-y divide-border/30">
              {summary.files.map((f) => {
                const meta = STATUS_META[f.status];
                const Icon = meta.Icon;
                const isActive = f.path === activePath;
                return (
                  <li key={f.path}>
                    <button
                      type="button"
                      onClick={() => setSelected(f.path)}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors ${
                        isActive ? 'bg-primary/10' : 'hover:bg-muted/30'
                      }`}
                    >
                      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${meta.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-mono">{f.path}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                          <span className={`rounded ${meta.bg} ${meta.color} px-1`}>
                            {meta.label}
                          </span>
                          {f.status !== 'unchanged' && (
                            <>
                              <span className="text-emerald-500">+{f.added}</span>
                              <span className="text-red-500">−{f.removed}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <main className="flex-1 overflow-auto bg-background/60">
          {activeFile ? (
            <>
              <div className="sticky top-0 z-10 border-b border-border/50 bg-card/95 px-4 py-2 text-xs font-mono">
                {activeFile.path}
              </div>
              <DiffLines file={activeFile} />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Selecciona un archivo
            </div>
          )}
        </main>
      </div>
    </div>
  );
}