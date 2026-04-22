/**
 * WCSyncBanner — polls package.json inside the WebContainer and surfaces
 * a banner when it diverges from the editor's in-memory copy. Lets the
 * user import the WC-side change (e.g. after `npm install pkg` in the
 * terminal) without overwriting their editor state silently.
 */
import { useEffect, useState } from 'react';
import { ArrowDownToLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBuilderStore } from '@/features/builder/builderStore';
import { readWCFile, getWCSnapshot, subscribeWC } from '@/features/builder/webcontainerService';

const POLL_MS = 5000;
const TARGET_PATH = 'package.json';

export function WCSyncBanner() {
  const files = useBuilderStore((s) => s.files);
  const updateFileContent = useBuilderStore((s) => s.updateFileContent);
  const [wcContent, setWcContent] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [wcReady, setWcReady] = useState(getWCSnapshot().status === 'ready');

  useEffect(() => {
    return subscribeWC((s) => setWcReady(s.status === 'ready'));
  }, []);

  useEffect(() => {
    if (!wcReady) return;
    let cancelled = false;
    const tick = async () => {
      const content = await readWCFile(`/${TARGET_PATH}`);
      if (cancelled) return;
      setWcContent(content);
    };
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [wcReady]);

  const editorPkg = files.find((f) => f.path === TARGET_PATH)?.content ?? null;
  const diverged =
    wcContent !== null &&
    editorPkg !== null &&
    wcContent.trim() !== editorPkg.trim() &&
    wcContent !== dismissed;

  if (!diverged) return null;

  const importIntoEditor = () => {
    updateFileContent(TARGET_PATH, wcContent!);
    setDismissed(null);
    // updateFileContent flips dirty=true, so the auto-save timer kicks in
  };

  return (
    <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-3 py-1.5 text-xs">
      <ArrowDownToLine className="h-3.5 w-3.5 text-warning" />
      <span className="font-medium text-foreground">
        Cambios detectados en <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">package.json</code> del WebContainer
      </span>
      <span className="text-muted-foreground">— probablemente un <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">npm install</code> desde la terminal</span>
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="default" className="h-6 text-[10px]" onClick={importIntoEditor}>
          Importar al editor
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setDismissed(wcContent)}
          title="Descartar (volverá a aparecer si cambia de nuevo)"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
