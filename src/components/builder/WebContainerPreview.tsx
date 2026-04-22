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
import { Loader2, Terminal as TerminalIcon, RotateCw, AlertCircle, Trash2, ShieldCheck, ShieldAlert, Folder, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  startWebContainer,
  writeFiles,
  teardownWebContainer,
  subscribeWC,
  subscribeWCLogs,
  getWCSnapshot,
  clearWCCache,
  getCurrentProjectKey,
  type WCSnapshot,
  type WCLog,
} from '@/features/builder/webcontainerService';
import { isWebContainersAvailable } from '@/features/builder/sandboxPrefs';
import type { GeneratedFile } from '@/features/projects/projectTypes';
import { WebContainerTerminal } from './WebContainerTerminal';
import { WCFileExplorer } from './WCFileExplorer';

interface Props {
  files: GeneratedFile[];
  projectName: string;
  projectId?: string;
}

export function WebContainerPreview({ files, projectName, projectId }: Props) {
  const [snap, setSnap] = useState<WCSnapshot>(getWCSnapshot());
  const [logs, setLogs] = useState<WCLog[]>([]);
  const [bottomTab, setBottomTab] = useState<'none' | 'logs' | 'terminal' | 'files'>('none');
  const [hmrTick, setHmrTick] = useState<number>(0);
  const filesRef = useRef(files);
  filesRef.current = files;

  const isolated = typeof window !== 'undefined' && Boolean((window as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated);
  const hasSAB = typeof SharedArrayBuffer !== 'undefined';

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
      startWebContainer(projectName, filesRef.current, projectId).catch(() => {
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
    writeFiles(projectName, files)
      .then(() => setHmrTick((t) => t + 1))
      .catch(() => {});
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
    startWebContainer(projectName, filesRef.current, projectId).catch(() => {});
  };

  const wipeCacheAndRestart = async () => {
    await teardownWebContainer();
    await clearWCCache(getCurrentProjectKey() ?? undefined);
    setLogs([]);
    startWebContainer(projectName, filesRef.current, projectId).catch(() => {});
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
        <span
          className={`ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
            isolated && hasSAB ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'
          }`}
          title={`crossOriginIsolated: ${isolated ? '✓' : '✗'} · SharedArrayBuffer: ${hasSAB ? '✓' : '✗'}`}
        >
          {isolated && hasSAB ? <ShieldCheck className="h-2.5 w-2.5" /> : <ShieldAlert className="h-2.5 w-2.5" />}
          COI {isolated ? '✓' : '✗'} · SAB {hasSAB ? '✓' : '✗'}
        </span>
        {snap.status === 'ready' && hmrTick > 0 && (
          <span
            key={hmrTick}
            className="ml-1 inline-flex animate-pulse items-center gap-1 rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-semibold text-accent-foreground"
            title={`Último HMR push #${hmrTick}`}
          >
            <Zap className="h-2.5 w-2.5" />
            HMR #{hmrTick}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-[10px] ${bottomTab === 'files' ? 'bg-muted' : ''}`}
            onClick={() => setBottomTab((v) => (v === 'files' ? 'none' : 'files'))}
            disabled={snap.status !== 'ready'}
            title="Explorar el filesystem real del WebContainer"
          >
            <Folder className="mr-1 h-3 w-3" />
            Files
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-[10px] ${bottomTab === 'logs' ? 'bg-muted' : ''}`}
            onClick={() => setBottomTab((v) => (v === 'logs' ? 'none' : 'logs'))}
          >
            <TerminalIcon className="mr-1 h-3 w-3" />
            Logs ({logs.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-[10px] ${bottomTab === 'terminal' ? 'bg-muted' : ''}`}
            onClick={() => setBottomTab((v) => (v === 'terminal' ? 'none' : 'terminal'))}
            disabled={snap.status !== 'ready'}
            title={snap.status !== 'ready' ? 'Disponible cuando WC esté ready' : 'Terminal interactiva (jsh)'}
          >
            <TerminalIcon className="mr-1 h-3 w-3" />
            Terminal
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={wipeCacheAndRestart}
            disabled={snap.status === 'booting' || snap.status === 'installing'}
            title="Borra el snapshot cacheado y vuelve a hacer npm install limpio"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Limpiar cache
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

        {bottomTab === 'logs' && (
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

        {bottomTab === 'terminal' && snap.status === 'ready' && (
          <div className="h-64 overflow-hidden border-t border-border/50 bg-[#0a0b10] p-1">
            <WebContainerTerminal />
          </div>
        )}

        {bottomTab === 'files' && snap.status === 'ready' && (
          <div className="h-72 overflow-hidden border-t border-border/50">
            <WCFileExplorer />
          </div>
        )}
      </div>
    </div>
  );
}