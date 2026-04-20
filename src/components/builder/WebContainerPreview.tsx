/**
 * WebContainerPreview — third sandbox mode (real Node.js + Vite in the
 * browser via @webcontainer/api). Boots the runtime, runs `npm install`
 * and `npm run dev`, then renders the dev server URL inside an iframe.
 *
 * Pre-flight: refuses to boot if the page is not cross-origin isolated.
 * The user-facing flag (`profiles.webcontainers_enabled`) is checked at
 * a higher level (PreviewPanel) before this component is mounted.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2, Terminal as TerminalIcon, RotateCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  startWebContainer,
  writeFiles,
  teardownWebContainer,
  subscribeWC,
  subscribeWCLogs,
  getWCSnapshot,
  type WCSnapshot,
  type WCLog,
} from '@/features/builder/webcontainerService';
import { isWebContainersAvailable } from '@/features/builder/sandboxPrefs';
import type { GeneratedFile } from '@/features/projects/projectTypes';

interface Props {
  files: GeneratedFile[];
  projectName: string;
}

export function WebContainerPreview({ files, projectName }: Props) {
  const [snap, setSnap] = useState<WCSnapshot>(getWCSnapshot());
  const [logs, setLogs] = useState<WCLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const filesRef = useRef(files);
  filesRef.current = files;

  // Subscribe to status + logs
  useEffect(() => {
    const off1 = subscribeWC(setSnap);
    const off2 = subscribeWCLogs((log) => {
      setLogs((prev) => (prev.length > 500 ? [...prev.slice(-400), log] : [...prev, log]));
    });
    return () => {
      off1();
      off2();
    };
  }, []);

  // Boot once on mount; teardown on unmount (only if the user navigates
  // away from webcontainer mode entirely).
  useEffect(() => {
    if (!isWebContainersAvailable()) {
      return;
    }
    if (snap.status === 'idle') {
      startWebContainer(projectName, filesRef.current).catch(() => {
        /* error already captured in snapshot */
      });
    }
    return () => {
      // Don't teardown on every re-render — only when the parent unmounts.
      // Sandbox toggle in ProjectHeader unmounts this component.
      teardownWebContainer().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hot-update files on changes once the dev server is ready
  useEffect(() => {
    if (snap.status !== 'ready') return;
    writeFiles(projectName, files).catch(() => {});
  }, [files, projectName, snap.status]);

  if (!isWebContainersAvailable()) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border/50 bg-card p-6 text-center shadow-elevated">
        <AlertCircle className="h-8 w-8 text-primary" />
        <h3 className="text-base font-semibold">WebContainers no disponible</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Esta página no tiene los headers <code className="rounded bg-muted px-1">COOP/COEP</code> activos
          o tu navegador no soporta <code className="rounded bg-muted px-1">SharedArrayBuffer</code>.
          Vuelve a iframe o Sandpack para previsualizar.
        </p>
        <p className="text-xs text-muted-foreground">
          (Recarga la página después de activar WebContainers; los headers se aplican solo en /builder.)
        </p>
      </div>
    );
  }

  const statusLabel: Record<WCSnapshot['status'], string> = {
    idle: 'Inicializando…',
    booting: 'Booting WebContainer…',
    mounting: 'Montando archivos…',
    installing: 'npm install (puede tardar 30-60s la primera vez)…',
    starting: 'Iniciando Vite dev server…',
    ready: 'Listo',
    error: 'Error',
  };

  const restart = async () => {
    await teardownWebContainer();
    setLogs([]);
    startWebContainer(projectName, filesRef.current).catch(() => {});
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border/50 bg-card shadow-elevated">
      {/* Status bar */}
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-1.5">
        {snap.status !== 'ready' && snap.status !== 'error' && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        )}
        {snap.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
        <span className="text-xs font-medium">
          {snap.status === 'error' ? snap.error || 'Error' : statusLabel[snap.status]}
        </span>
        {snap.url && (
          <span className="ml-2 truncate font-mono text-[10px] text-muted-foreground">{snap.url}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setShowLogs((v) => !v)}
          >
            <TerminalIcon className="mr-1 h-3 w-3" />
            Logs ({logs.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={restart}
            disabled={snap.status === 'booting' || snap.status === 'installing'}
          >
            <RotateCw className="mr-1 h-3 w-3" />
            Reiniciar
          </Button>
        </div>
      </div>

      {/* Main area: iframe (when ready) + log drawer */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 bg-background">
          {snap.status === 'ready' && snap.url ? (
            <iframe
              src={snap.url}
              className="h-full w-full"
              title="WebContainer Preview"
              style={{ border: 'none' }}
              allow="cross-origin-isolated"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              {snap.status === 'error' ? (
                <>
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="max-w-md text-center text-destructive">{snap.error}</p>
                </>
              ) : (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p>{statusLabel[snap.status]}</p>
                  {snap.status === 'installing' && (
                    <p className="text-xs text-muted-foreground/80">
                      WebContainers ejecuta npm dentro del browser. La primera instalación tarda más.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {showLogs && (
          <div className="h-48 overflow-auto border-t border-border/50 bg-foreground/95 p-2 font-mono text-[11px] text-background">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">Sin logs todavía…</div>
            ) : (
              logs.map((l, i) => (
                <div
                  key={i}
                  className={
                    l.kind === 'stderr'
                      ? 'text-destructive'
                      : l.kind === 'system'
                      ? 'text-primary'
                      : 'text-background'
                  }
                >
                  {l.line}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}