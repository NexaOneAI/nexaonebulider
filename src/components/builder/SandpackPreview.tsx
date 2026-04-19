/**
 * Sandpack-based preview engine. Used as an opt-in alternative to the
 * legacy iframe + Sucrase preview. Gives us:
 *   - HMR (state preserved across edits)
 *   - URL bar + back/forward (real React Router navigation)
 *   - Live console feed → wired into previewLogsStore
 *
 * Files from the builder store are mapped into Sandpack's virtual file
 * system. A synthetic `index.tsx` mounts the user's App.tsx so any
 * generated app works without modification.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview as SPPreview,
  useSandpack,
} from '@codesandbox/sandpack-react';
import type { GeneratedFile } from '@/features/projects/projectTypes';
import { extractDependencies } from '@/features/builder/sandboxDeps';
import { usePreviewLogsStore } from '@/features/builder/previewLogsStore';

interface Props {
  files: GeneratedFile[];
  projectName: string;
  /** When true, exposes Sandpack URL bar / refresh / open-in-new-tab. */
  showNavigator?: boolean;
}

const ENTRY = '/index.tsx';

/** Build the Sandpack file map from the AI-generated files. */
function buildSandpackFiles(files: GeneratedFile[]): Record<string, { code: string }> {
  const out: Record<string, { code: string }> = {};

  for (const f of files) {
    // Sandpack expects leading slash and only source/asset files
    const path = f.path.startsWith('/') ? f.path : `/${f.path}`;
    out[path] = { code: f.content };
  }

  // Synthetic entry that mounts /src/App.tsx (or .jsx)
  const appPath = files.find(
    (f) =>
      f.path === 'src/App.tsx' ||
      f.path === 'src/App.jsx' ||
      f.path === 'App.tsx' ||
      f.path === 'App.jsx',
  )?.path;

  const importPath = appPath ? `/${appPath}`.replace(/\.(t|j)sx?$/, '') : '/src/App';

  out[ENTRY] = {
    code: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '${importPath}';

const rootEl = document.getElementById('root');
if (rootEl) createRoot(rootEl).render(<React.StrictMode><App /></React.StrictMode>);
`,
  };

  // Tailwind via CDN + index.html bootstrap
  out['/public/index.html'] = {
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; margin: 0; }
  </style>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
  };

  return out;
}

/** Bridges Sandpack runtime messages → previewLogsStore. */
function SandpackBridge() {
  const { sandpack, listen } = useSandpack();
  const pushLog = usePreviewLogsStore((s) => s.push);
  const clearLogs = usePreviewLogsStore((s) => s.clear);
  const lastBundleId = useRef<string | null>(null);

  useEffect(() => {
    return listen((msg: any) => {
      if (msg.type === 'console' && Array.isArray(msg.log)) {
        for (const entry of msg.log) {
          const level =
            entry.method === 'warn'
              ? 'warn'
              : entry.method === 'error'
                ? 'error'
                : entry.method === 'info'
                  ? 'info'
                  : entry.method === 'debug'
                    ? 'debug'
                    : 'log';
          const message = (entry.data || [])
            .map((d: unknown) => (typeof d === 'string' ? d : safeStringify(d)))
            .join(' ');
          pushLog({ type: 'console', level, message });
        }
      } else if (msg.type === 'action' && msg.action === 'show-error') {
        pushLog({
          type: 'console',
          level: 'error',
          message: `${msg.title || 'Error'}\n${msg.message || ''}`,
        });
      }
    });
  }, [listen, pushLog]);

  // Reset logs whenever a fresh bundle starts (HMR keeps the same id)
  useEffect(() => {
    const status = sandpack.status;
    const id = sandpack.bundlerState?.transpiledModules
      ? Object.keys(sandpack.bundlerState.transpiledModules).sort().join('|').slice(0, 64)
      : null;
    if (status === 'running' && id && id !== lastBundleId.current) {
      lastBundleId.current = id;
      clearLogs();
    }
  }, [sandpack.status, sandpack.bundlerState, clearLogs]);

  return null;
}

function safeStringify(d: unknown): string {
  try {
    return JSON.stringify(d, null, 2).slice(0, 2000);
  } catch {
    return String(d);
  }
}

export function SandpackPreview({ files, projectName, showNavigator = true }: Props) {
  const sandpackFiles = useMemo(() => buildSandpackFiles(files), [files]);
  const dependencies = useMemo(() => extractDependencies(files), [files]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border/50 bg-card shadow-elevated">
      <SandpackProvider
        template="react-ts"
        files={sandpackFiles}
        customSetup={{ dependencies, entry: ENTRY }}
        options={{
          recompileMode: 'delayed',
          recompileDelay: 350,
          autoReload: true,
          classes: { 'sp-wrapper': 'h-full' },
        }}
        theme="dark"
      >
        <SandpackBridge />
        <SandpackLayout style={{ height: '100%', borderRadius: 0 }}>
          <SPPreview
            showNavigator={showNavigator}
            showRefreshButton
            showOpenInCodeSandbox={false}
            style={{ height: '100%', minWidth: 0 }}
            title={projectName}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
