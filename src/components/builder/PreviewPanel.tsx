import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useBuilder } from '@/hooks/useBuilder';
import { CodeEditor } from './CodeEditor';
import { DevToolsPanel } from './DevToolsPanel';
import { VisualEditPopover } from './VisualEditPopover';
import { VisualEditsActionBar } from './VisualEditsActionBar';
import { PreviewFrame } from './PreviewFrame';
import { Monitor, Code2, Eye, Terminal, MousePointerClick, Frame } from 'lucide-react';
import { VIEW_WIDTHS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useBuilderStore } from '@/features/builder/builderStore';
import { usePreviewLogsStore } from '@/features/builder/previewLogsStore';
import { usePreviewErrorsStore } from '@/features/builder/previewErrorsStore';
import { useVisualEditsStore } from '@/features/visualEdits/visualEditsStore';
import type { SelectedElement } from '@/features/visualEdits/types';
import {
  getPreviewFrame,
  setPreviewFrame,
  subscribePreviewFrame,
  PREVIEW_FRAMES,
  type PreviewFrame as PreviewFrameKind,
} from '@/features/builder/previewFrame';
import {
  getSandbox,
  subscribeSandbox,
  type SandboxKind,
} from '@/features/builder/sandboxPrefs';

// Lazy-load Sandpack (~150KB gzip) so the iframe path stays light.
const SandpackPreview = lazy(() =>
  import('./SandpackPreview').then((m) => ({ default: m.SandpackPreview })),
);
const WebContainerPreview = lazy(() =>
  import('./WebContainerPreview').then((m) => ({ default: m.WebContainerPreview })),
);

export function PreviewPanel() {
  const { previewCode, viewMode, selectedFile, files } = useBuilder();
  const projectId = useBuilderStore((s) => s.projectId);
  const highlightLine = useBuilderStore((s) => s.highlightLine);
  const showCode = useBuilderStore((s) => s.showCode);
  const setShowCode = useBuilderStore((s) => s.setShowCode);
  const setSelectedFile = useBuilderStore((s) => s.setSelectedFile);
  const setPreviewError = useBuilderStore((s) => s.setPreviewError);
  const pushLog = usePreviewLogsStore((s) => s.push);
  const clearLogs = usePreviewLogsStore((s) => s.clear);
  const events = usePreviewLogsStore((s) => s.events);
  const pushPreviewError = usePreviewErrorsStore((s) => s.push);
  const clearPreviewErrors = usePreviewErrorsStore((s) => s.clear);
  const [devOpen, setDevOpen] = useState(false);
  const [frame, setFrame] = useState<PreviewFrameKind>(() => getPreviewFrame(projectId));
  const [frameMenu, setFrameMenu] = useState(false);
  const [sandbox, setSandbox] = useState<SandboxKind>(() => getSandbox(projectId));

  // Re-read frame when project changes or external listener fires
  useEffect(() => {
    setFrame(getPreviewFrame(projectId));
    return subscribePreviewFrame(() => setFrame(getPreviewFrame(projectId)));
  }, [projectId]);

  // Re-read sandbox kind on project change / external toggle
  useEffect(() => {
    setSandbox(getSandbox(projectId));
    return subscribeSandbox(() => setSandbox(getSandbox(projectId)));
  }, [projectId]);

  const handleSelectFrame = (f: PreviewFrameKind) => {
    if (!projectId) return;
    setPreviewFrame(projectId, f);
    setFrame(f);
    setFrameMenu(false);
  };

  const visualEnabled = useVisualEditsStore((s) => s.enabled);
  const setVisualEnabled = useVisualEditsStore((s) => s.setEnabled);
  const setSelected = useVisualEditsStore((s) => s.setSelected);
  const selected = useVisualEditsStore((s) => s.selected);
  const pendingCount = useVisualEditsStore((s) => s.pending.length);
  const commitVisual = useVisualEditsStore((s) => s.commit);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeRect, setIframeRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Reset logs whenever a new preview is rendered
  useEffect(() => {
    if (previewCode) {
      clearLogs();
      clearPreviewErrors();
    }
  }, [previewCode, clearLogs, clearPreviewErrors]);

  // Push visual-edit-mode to the iframe whenever it toggles or iframe reloads
  useEffect(() => {
    const post = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { source: 'lovable-builder', kind: 'visual-edit-mode', enabled: visualEnabled },
          '*',
        );
      } catch {}
    };
    post();
    // also re-post once after a short delay to catch cases where iframe is still loading
    const t = window.setTimeout(post, 400);
    return () => window.clearTimeout(t);
  }, [visualEnabled, previewCode]);

  // Track iframe rect for popover positioning (resize/scroll aware)
  useEffect(() => {
    const update = () => {
      const r = iframeRef.current?.getBoundingClientRect();
      if (r) setIframeRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [previewCode, visualEnabled]);

  // Keyboard shortcuts (only active when Visual Edits is on)
  useEffect(() => {
    if (!visualEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      // Ignore typing in inputs/textareas/contenteditable
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const isTyping =
        tag === 'INPUT' || tag === 'TEXTAREA' || (t && (t as HTMLElement).isContentEditable);

      if (e.key === 'Escape' && !isTyping) {
        if (selected) {
          setSelected(null);
          try {
            iframeRef.current?.contentWindow?.postMessage(
              { source: 'lovable-builder', kind: 'visual-edit-deselect' },
              '*',
            );
          } catch {}
        } else {
          setVisualEnabled(false);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && pendingCount > 0) {
        e.preventDefault();
        commitVisual();
        return;
      }

      if (e.key === 'ArrowUp' && (e.altKey || e.metaKey) && selected) {
        e.preventDefault();
        try {
          iframeRef.current?.contentWindow?.postMessage(
            { source: 'lovable-builder', kind: 'visual-edit-select-parent' },
            '*',
          );
        } catch {}
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visualEnabled, selected, pendingCount, setSelected, setVisualEnabled, commitVisual]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== 'lovable-preview') return;
      if (d.kind === 'preview-error') {
        const message = String(d.message || '');
        const stack = String(d.stack || '');
        setPreviewError({ message, stack, at: Date.now() });
        pushPreviewError({ message, stack });
        pushLog({
          type: 'console',
          level: 'error',
          message: `${message}\n${stack}`.trim(),
        });
      } else if (d.kind === 'preview-ready') {
        setPreviewError(null);
      } else if (d.kind === 'preview-console') {
        const level = (d.level || 'log') as 'log' | 'info' | 'warn' | 'error' | 'debug';
        const message = String(d.message ?? '');
        pushLog({ type: 'console', level, message });
        // Heurística: console.error con shape de error de React → alimentar errores
        if (
          level === 'error' &&
          /(Cannot read|is not defined|is not a function|undefined is not|Invalid hook|Maximum update depth|Element type is invalid|Failed to compile)/i.test(
            message,
          )
        ) {
          pushPreviewError({ message: message.split('\n')[0].slice(0, 300), stack: message });
        }
      } else if (d.kind === 'preview-network') {
        pushLog({
          type: 'network',
          method: String(d.method || 'GET'),
          url: String(d.url || ''),
          status: typeof d.status === 'number' ? d.status : undefined,
          ok: typeof d.ok === 'boolean' ? d.ok : undefined,
          durationMs: typeof d.durationMs === 'number' ? d.durationMs : undefined,
          error: d.error,
        });
      } else if (d.kind === 'visual-edit-select') {
        const sel: SelectedElement = {
          uid: String(d.uid || ''),
          tag: String(d.tag || 'div'),
          text: String(d.text || ''),
          isTextLeaf: Boolean(d.isTextLeaf),
          className: String(d.className || ''),
          location: d.location || null,
          rect: d.rect || { x: 0, y: 0, width: 0, height: 0 },
          attributes: d.attributes || {},
        } as SelectedElement;
        setSelected(sel);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setPreviewError, pushLog, pushPreviewError, setSelected]);

  const hasContent = Boolean(previewCode) || files.length > 0;
  const showingCode = showCode && Boolean(selectedFile);

  const errorCount = events.filter(
    (e) => (e.type === 'console' && e.level === 'error') || (e.type === 'network' && (e.error || (e.status && e.status >= 400))),
  ).length;

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Toolbar */}
      {hasContent && (
        <div className="flex items-center gap-2 border-b border-border/50 bg-card/50 px-4 py-2">
          <Button
            variant={!showingCode ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowCode(false)}
          >
            <Eye className="mr-1 h-3 w-3" />
            Preview
          </Button>
          <Button
            variant={showingCode ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            disabled={files.length === 0}
            onClick={() => {
              if (!selectedFile && files.length > 0) {
                setSelectedFile(files[0]);
              }
              setShowCode(true);
            }}
          >
            <Code2 className="mr-1 h-3 w-3" />
            Código
          </Button>
          <Button
            variant={visualEnabled ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            disabled={!previewCode || showingCode}
            onClick={() => setVisualEnabled(!visualEnabled)}
            title="Edita textos, colores, fuente y spacing sin gastar créditos"
          >
            <MousePointerClick className="mr-1 h-3 w-3" />
            Editar visual
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded bg-primary-foreground/20 px-1 text-[10px]">
                {pendingCount}
              </span>
            )}
          </Button>
          {showingCode && selectedFile && (
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {selectedFile.path}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {previewCode && !showingCode && (
              <div className="relative">
                <Button
                  variant={frame !== 'none' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFrameMenu((v) => !v)}
                  title="Marco de dispositivo del preview"
                >
                  <Frame className="mr-1 h-3 w-3" />
                  {PREVIEW_FRAMES.find((f) => f.id === frame)?.label || 'Marco'}
                </Button>
                {frameMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setFrameMenu(false)} />
                    <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-md border border-border bg-popover shadow-elevated">
                      {PREVIEW_FRAMES.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleSelectFrame(f.id)}
                          className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-muted/60 ${
                            frame === f.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          <span>{f.label}</span>
                          {frame === f.id && <span className="text-[10px]">●</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <Button
              variant={devOpen ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setDevOpen((v) => !v)}
            >
              <Terminal className="mr-1 h-3 w-3" />
              DevTools
              {errorCount > 0 && (
                <span className="ml-1.5 rounded bg-destructive/20 px-1 text-[10px] text-destructive">
                  {errorCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {hasContent ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 justify-center overflow-auto p-4">
            <div
              className="flex h-full min-h-[600px] w-full flex-col overflow-hidden transition-all"
              style={{ maxWidth: frame === 'none' ? VIEW_WIDTHS[viewMode] : undefined }}
            >
              {showingCode && selectedFile ? (
                <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border/50 bg-card shadow-elevated">
                  <CodeEditor file={selectedFile} highlightLine={highlightLine ?? undefined} />
                </div>
              ) : sandbox === 'sandpack' && files.length > 0 ? (
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center rounded-lg border border-border/50 bg-card text-sm text-muted-foreground shadow-elevated">
                      Cargando Sandpack…
                    </div>
                  }
                >
                  <SandpackPreview files={files} projectName="Preview" showNavigator />
                </Suspense>
              ) : sandbox === 'webcontainer' && files.length > 0 ? (
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center rounded-lg border border-border/50 bg-card text-sm text-muted-foreground shadow-elevated">
                      Cargando WebContainer…
                    </div>
                  }
                >
                  <WebContainerPreview files={files} projectName="Preview" />
                </Suspense>
              ) : previewCode ? (
                <PreviewFrame frame={frame}>
                  <iframe
                    ref={iframeRef}
                    key={previewCode.length}
                    srcDoc={previewCode}
                    className="h-full w-full flex-1"
                    sandbox="allow-scripts allow-same-origin"
                    title="Live Preview"
                    style={{ border: 'none', background: 'white', display: 'block' }}
                  />
                </PreviewFrame>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-border/50 bg-card text-sm text-muted-foreground shadow-elevated">
                  Selecciona un archivo o genera la preview
                </div>
              )}
            </div>
          </div>
          <VisualEditsActionBar />
          <DevToolsPanel open={devOpen} onClose={() => setDevOpen(false)} />
          {visualEnabled && selected && <VisualEditPopover iframeRect={iframeRect} />}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
            <Monitor className="h-10 w-10 text-primary/50" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Live Preview</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Escribe un prompt en el chat para generar tu app. La preview se actualizará en tiempo real.
          </p>
        </div>
      )}
    </div>
  );
}
