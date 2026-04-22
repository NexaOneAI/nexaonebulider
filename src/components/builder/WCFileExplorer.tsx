/**
 * WCFileExplorer — surfaces the *real* filesystem inside the running
 * WebContainer (node_modules, dist, generated files included). Lazy
 * expansion: each directory is fetched on click via the WC fs API.
 */
import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listWCDir, readWCFile, type WCFsNode } from '@/features/builder/webcontainerService';

interface NodeRowProps {
  node: WCFsNode;
  depth: number;
  onPick: (path: string) => void;
}

function NodeRow({ node, depth, onPick }: NodeRowProps) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<WCFsNode[] | null>(null);

  const toggle = async () => {
    if (!node.isDir) {
      onPick(node.path);
      return;
    }
    if (!open && children === null) {
      setChildren(await listWCDir(node.path));
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-1 px-1 py-0.5 text-left text-xs hover:bg-muted/40"
        style={{ paddingLeft: `${depth * 10 + 4}px` }}
      >
        {node.isDir ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <span className="w-3" />
        )}
        {node.isDir ? (
          <Folder className="h-3 w-3 shrink-0 text-primary/70" />
        ) : (
          <File className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-mono">{node.name}</span>
      </button>
      {open && children?.map((c) => (
        <NodeRow key={c.path} node={c} depth={depth + 1} onPick={onPick} />
      ))}
    </>
  );
}

export function WCFileExplorer() {
  const [root, setRoot] = useState<WCFsNode[]>([]);
  const [picked, setPicked] = useState<{ path: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setRoot(await listWCDir('/'));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onPick = async (path: string) => {
    const content = await readWCFile(path);
    setPicked({ path, content: content ?? '(no se pudo leer este archivo)' });
  };

  return (
    <div className="flex h-full">
      <div className="flex h-full w-64 shrink-0 flex-col border-r border-border/50 bg-card/30">
        <div className="flex items-center justify-between border-b border-border/50 px-2 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            WC Filesystem
          </span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={refresh} disabled={loading}>
            <RotateCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex-1 overflow-auto py-1">
          {root.length === 0 ? (
            <div className="px-2 py-4 text-center text-[11px] text-muted-foreground">
              {loading ? 'Cargando…' : 'WebContainer no listo todavía'}
            </div>
          ) : (
            root.map((n) => <NodeRow key={n.path} node={n} depth={0} onPick={onPick} />)
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {picked ? (
          <>
            <div className="border-b border-border/50 bg-card/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
              {picked.path}
            </div>
            <pre className="flex-1 overflow-auto bg-muted/10 p-2 font-mono text-[11px] leading-5 text-foreground/90">
              {picked.content}
            </pre>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            Selecciona un archivo del árbol para verlo (real fs del contenedor)
          </div>
        )}
      </div>
    </div>
  );
}