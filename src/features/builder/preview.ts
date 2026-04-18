import { transform } from 'sucrase';
import type { GeneratedFile } from '../projects/projectTypes';
import { SHADCN_STUBS } from './shadcnStubs';

/**
 * Lovable-grade live preview:
 *  1) Importmap → resolves bare specifiers (lucide-react, react-router-dom,
 *     framer-motion, recharts, clsx, sonner, etc.) via esm.sh
 *  2) Pre-bundled shadcn/ui stubs for "@/components/ui/*" so generated apps
 *     using shadcn don't crash
 *  3) Runtime error capture via postMessage('preview-error', ...) so the
 *     parent window can offer "Fix with AI"
 *  4) Sucrase transpiles TS/TSX → ESM, then we bundle into a single module
 *     where local files become URL.createObjectURL blobs (real ES modules)
 */
export function generatePreviewHtml(
  files: GeneratedFile[],
  projectName: string,
  _model: string,
): string {
  const appFile = files.find(
    (f) =>
      f.path === 'src/App.tsx' ||
      f.path === 'src/App.jsx' ||
      f.path === 'App.tsx' ||
      f.path === 'App.jsx',
  );

  if (!appFile) return generateFallbackPreview(files, projectName);

  // Collect all source files (TS/JS/TSX/JSX), excluding entry points & configs
  const sourceFiles = files.filter(
    (f) =>
      (f.path.endsWith('.tsx') ||
        f.path.endsWith('.jsx') ||
        f.path.endsWith('.ts') ||
        f.path.endsWith('.js')) &&
      !f.path.endsWith('main.tsx') &&
      !f.path.endsWith('main.jsx') &&
      !f.path.endsWith('main.ts') &&
      !f.path.endsWith('main.js') &&
      !f.path.endsWith('.d.ts') &&
      !f.path.endsWith('.config.js') &&
      !f.path.endsWith('.config.ts') &&
      !f.path.endsWith('vite.config.ts') &&
      !f.path.endsWith('tailwind.config.ts'),
  );

  const cssContent = files
    .filter((f) => f.path.endsWith('.css') && !f.path.endsWith('index.css'))
    .map((f) => f.content)
    .join('\n');

  // Build a virtual module map: path (normalised) → transpiled code
  const moduleMap = new Map<string, string>();
  for (const f of sourceFiles) {
    const normalised = normalisePath(f.path);
    moduleMap.set(normalised, transpileSafe(f.content, f.path));
  }

  // Inject shadcn stubs for any "@/components/ui/*" import used by the code
  // but not provided by the AI
  const usedShadcn = collectUsedShadcn(sourceFiles);
  for (const comp of usedShadcn) {
    const key = `src/components/ui/${comp}`;
    if (!moduleMap.has(key) && SHADCN_STUBS[comp]) {
      moduleMap.set(key, SHADCN_STUBS[comp]);
    }
  }

  // Inject lib/utils stub if used and missing
  if (!moduleMap.has('src/lib/utils')) {
    const usesUtils = sourceFiles.some((f) =>
      /from\s+['"]@\/lib\/utils['"]/.test(f.content),
    );
    if (usesUtils) {
      moduleMap.set(
        'src/lib/utils',
        `import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) { return twMerge(clsx(inputs)); }`,
      );
    }
  }

  // Serialise modules as a JSON map the bootstrap can turn into blob URLs
  const modulesJson = JSON.stringify(Object.fromEntries(moduleMap));
  const appPath = normalisePath(appFile.path);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(projectName)}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { min-height: 100vh; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    ${cssContent}
  </style>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.3.1",
      "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
      "react-dom": "https://esm.sh/react-dom@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
      "react-router-dom": "https://esm.sh/react-router-dom@6.26.2?external=react,react-dom",
      "lucide-react": "https://esm.sh/lucide-react@0.462.0?external=react",
      "framer-motion": "https://esm.sh/framer-motion@11.11.0?external=react,react-dom",
      "recharts": "https://esm.sh/recharts@2.12.7?external=react,react-dom",
      "clsx": "https://esm.sh/clsx@2.1.1",
      "tailwind-merge": "https://esm.sh/tailwind-merge@2.5.4",
      "class-variance-authority": "https://esm.sh/class-variance-authority@0.7.1",
      "sonner": "https://esm.sh/sonner@1.5.0?external=react,react-dom",
      "date-fns": "https://esm.sh/date-fns@3.6.0",
      "zod": "https://esm.sh/zod@3.23.8",
      "zustand": "https://esm.sh/zustand@4.5.5?external=react",
      "@tanstack/react-query": "https://esm.sh/@tanstack/react-query@5.56.2?external=react",
      "react-hook-form": "https://esm.sh/react-hook-form@7.53.0?external=react"
    }
  }
  <\/script>
</head>
<body>
  <div id="root"></div>
  <script>
    // Forward runtime errors to the parent (Lovable builder) so it can
    // offer "Fix with AI"
    function __report(kind, payload) {
      try {
        window.parent.postMessage({ source: 'lovable-preview', kind, ...payload }, '*');
      } catch (_) {}
    }
    function __renderError(msg, stack) {
      var root = document.getElementById('root');
      if (root) {
        root.innerHTML =
          '<div style="padding:2rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#fca5a5;background:#0f172a;min-height:100vh;overflow:auto">' +
          '<h2 style="color:#f97316;margin-bottom:0.75rem;font-family:Inter,sans-serif;font-size:18px;font-weight:600">⚠️ Preview Error</h2>' +
          '<pre style="white-space:pre-wrap;font-size:12px;line-height:1.5">' + escapeHtml(String(stack || msg)) + '</pre>' +
          '<p style="margin-top:1rem;color:#64748b;font-size:11px;font-family:Inter,sans-serif">Usa el botón "Arreglar con IA" en el chat para corregirlo automáticamente.</p>' +
          '</div>';
      }
      __report('preview-error', { message: String(msg), stack: String(stack || '') });
    }
    function escapeHtml(s){return s.replace(/[<>&]/g,function(c){return {"<":"&lt;",">":"&gt;","&":"&amp;"}[c];});}
    window.addEventListener('error', function (e) {
      __renderError(e.message || 'Unknown error', (e.error && e.error.stack) || e.message);
    });
    window.addEventListener('unhandledrejection', function (e) {
      var r = e.reason || {};
      __renderError(r.message || 'Unhandled promise rejection', r.stack || String(r));
    });
  <\/script>
  <script type="module">
    const MODULES = ${modulesJson};
    const APP_PATH = ${JSON.stringify(appPath)};

    // Resolve a relative/aliased import against the importing file path
    function resolveSpecifier(spec, fromPath) {
      // alias @/...  →  src/...
      if (spec.startsWith('@/')) {
        return stripExt('src/' + spec.slice(2));
      }
      // relative
      if (spec.startsWith('./') || spec.startsWith('../')) {
        const fromDir = fromPath.split('/').slice(0, -1).join('/');
        const parts = (fromDir + '/' + spec).split('/');
        const out = [];
        for (const p of parts) {
          if (p === '' || p === '.') continue;
          if (p === '..') out.pop();
          else out.push(p);
        }
        return stripExt(out.join('/'));
      }
      return null; // bare specifier → handled by importmap
    }
    function stripExt(p) {
      return p.replace(/\\.(tsx|ts|jsx|js)$/, '');
    }

    // Find a module by candidate keys (with/without /index)
    function findModule(key) {
      if (MODULES[key]) return key;
      if (MODULES[key + '/index']) return key + '/index';
      return null;
    }

    // Rewrite imports in a module's source so relative/aliased imports
    // point at blob URLs. Bare specifiers stay (resolved by importmap).
    const blobUrls = new Map();
    function buildBlob(modulePath) {
      if (blobUrls.has(modulePath)) return blobUrls.get(modulePath);
      let src = MODULES[modulePath];
      if (src == null) throw new Error('Module not found: ' + modulePath);

      // Rewrite all import/export-from specifiers
      src = src.replace(
        /(\\bfrom\\s*|\\bimport\\s*)(['"])([^'"]+)\\2/g,
        (m, kw, q, spec) => {
          const resolved = resolveSpecifier(spec, modulePath);
          if (!resolved) return m; // bare → importmap
          const target = findModule(resolved);
          if (!target) {
            console.warn('[preview] Unresolved local import:', spec, 'from', modulePath);
            return m;
          }
          const url = buildBlob(target);
          return kw + q + url + q;
        },
      );
      // Also handle dynamic import('...')
      src = src.replace(
        /\\bimport\\s*\\(\\s*(['"])([^'"]+)\\1\\s*\\)/g,
        (m, q, spec) => {
          const resolved = resolveSpecifier(spec, modulePath);
          if (!resolved) return m;
          const target = findModule(resolved);
          if (!target) return m;
          return 'import(' + q + buildBlob(target) + q + ')';
        },
      );

      const blob = new Blob([src], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      blobUrls.set(modulePath, url);
      return url;
    }

    (async () => {
      try {
        const appUrl = buildBlob(APP_PATH);
        const [{ default: App }, React, ReactDOM] = await Promise.all([
          import(appUrl),
          import('react'),
          import('react-dom/client'),
        ]);
        if (!App) throw new Error('App.tsx no exporta un componente por default');
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
        __report('preview-ready', {});
      } catch (e) {
        __renderError(e && e.message || String(e), e && e.stack);
      }
    })();
  <\/script>
</body>
</html>`;
}

/**
 * Transpile TS/TSX/JS/JSX → ESM JS using Sucrase (preserves imports as ESM).
 */
function transpileSafe(src: string, filePath: string): string {
  const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const isJsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  try {
    const transforms: ('typescript' | 'jsx')[] = [];
    if (isTs) transforms.push('typescript');
    if (isJsx) transforms.push('jsx');
    const out = transform(src, {
      transforms,
      jsxRuntime: 'automatic',
      production: false,
      filePath,
    });
    return out.code;
  } catch (e) {
    const msg = String(e).replace(/`/g, '\\`');
    return `throw new Error(\`Transpile error in ${escapeJs(filePath)}: ${msg}\`);`;
  }
}

function normalisePath(p: string): string {
  return p.replace(/\.(tsx|ts|jsx|js)$/, '');
}

const SHADCN_COMPONENTS = [
  'button', 'card', 'input', 'label', 'textarea', 'badge', 'separator',
  'avatar', 'switch', 'checkbox', 'progress', 'skeleton', 'alert',
];

function collectUsedShadcn(files: GeneratedFile[]): string[] {
  const used = new Set<string>();
  const re = /from\s+['"]@\/components\/ui\/([a-z-]+)['"]/g;
  for (const f of files) {
    let m;
    while ((m = re.exec(f.content)) !== null) {
      if (SHADCN_COMPONENTS.includes(m[1])) used.add(m[1]);
    }
  }
  return [...used];
}

function generateFallbackPreview(files: GeneratedFile[], projectName: string): string {
  const fileList = files.map((f) => `<li class="py-0.5">${escapeHtml(f.path)}</li>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(projectName)}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen flex items-center justify-center font-sans">
  <div class="text-center max-w-md p-8">
    <h1 class="text-2xl font-bold text-cyan-400 mb-2">${escapeHtml(projectName)}</h1>
    <p class="text-gray-400 mb-6">${files.length} archivos generados (no se encontró App.tsx)</p>
    <ul class="text-left text-sm text-gray-500 bg-gray-900 rounded p-4 font-mono">${fileList}</ul>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
