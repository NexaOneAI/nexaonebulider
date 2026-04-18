import { transform } from 'sucrase';
import type { GeneratedFile } from '../projects/projectTypes';

/**
 * Generate a REAL live preview HTML.
 *
 * Strategy: transpile TSX/TS → plain JS at build time using Sucrase
 * (much more reliable than in-browser Babel with presets), then inject
 * the JS into the iframe. The iframe loads React/ReactDOM via UMD,
 * exposes hooks as globals, and runs each file as a regular <script>.
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

  const otherFiles = files.filter(
    (f) =>
      (f.path.endsWith('.tsx') ||
        f.path.endsWith('.jsx') ||
        f.path.endsWith('.ts') ||
        f.path.endsWith('.js')) &&
      !f.path.includes('main.') &&
      !f.path.endsWith('.d.ts') &&
      !f.path.endsWith('.config.js') &&
      !f.path.endsWith('.config.ts') &&
      f.path !== appFile.path,
  );

  // Order: types/utils (.ts/.js) first, then components (.tsx/.jsx)
  otherFiles.sort((a, b) => {
    const aIsType = a.path.endsWith('.ts') || a.path.endsWith('.js');
    const bIsType = b.path.endsWith('.ts') || b.path.endsWith('.js');
    if (aIsType && !bIsType) return -1;
    if (!aIsType && bIsType) return 1;
    return 0;
  });

  const cssContent = files
    .filter((f) => f.path.endsWith('.css'))
    .map((f) => f.content)
    .join('\n');

  const componentScripts = otherFiles
    .map((f) => {
      const js = transpileSafe(f.content, f.path);
      const exposed = extractTopLevelNames(js)
        .map((n) => `try{window.${n}=${n};}catch(_){}`)
        .join('');
      // Run at top-level (no IIFE / no try-wrapper) so var/function/class
      // become globals naturally; then re-expose on window for cross-script visibility.
      return `<script>\n${js}\n${exposed}\n<\/script>`;
    })
    .join('\n');

  const appJs = transpileSafe(appFile.content, appFile.path);

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
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; min-height: 100vh; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin><\/script>
  <script>
    // Expose React APIs globally so transpiled code (with imports stripped)
    // can use hooks/Fragment/etc as bare identifiers.
    (function () {
      var R = window.React;
      ['useState','useEffect','useCallback','useMemo','useRef','useContext',
       'useReducer','useLayoutEffect','useImperativeHandle','useTransition',
       'useDeferredValue','useId','Fragment','createContext','forwardRef',
       'memo','Suspense','lazy','Children','cloneElement','isValidElement',
       'createElement','PureComponent','Component']
        .forEach(function (k) { if (R && R[k] !== undefined) window[k] = R[k]; });
    })();

    function __renderError(msg) {
      var root = document.getElementById('root');
      root.innerHTML =
        '<div style="padding:2rem;font-family:ui-monospace,monospace;color:#fca5a5;background:#0f172a;min-height:100vh">' +
        '<h2 style="color:#f97316;margin-bottom:1rem;font-family:Inter,sans-serif;font-size:18px">⚠️ Preview Error</h2>' +
        '<pre style="white-space:pre-wrap;font-size:13px">' + String(msg).replace(/[<>&]/g, function(c){return {"<":"&lt;",">":"&gt;","&":"&amp;"}[c];}) + '</pre></div>';
    }
    window.addEventListener('error', function (e) {
      var root = document.getElementById('root');
      if (root && !root.hasChildNodes()) {
        __renderError((e.error && e.error.stack) || e.message || 'Unknown error');
      }
    });
  <\/script>
  ${componentScripts}
  <script>
    try {
${appJs}

      var rootEl = document.getElementById('root');
      var root = ReactDOM.createRoot(rootEl);
      root.render(React.createElement(App));
    } catch (e) {
      __renderError((e && e.stack) || e);
    }
  <\/script>
</body>
</html>`;
}

/**
 * Transpile TS/TSX/JS/JSX to plain ES5-compatible JS using Sucrase.
 * Strips imports/exports because we expose React as globals and run
 * each file as a non-module script (so `App` defined in App.tsx is
 * visible to the bootstrap script).
 */
function transpileSafe(src: string, filePath: string): string {
  // 1. Strip ES module syntax (Sucrase imports-transform requires a real
  // module loader; we want flat globals)
  let pre = src;
  pre = pre.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  pre = pre.replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '');
  pre = pre.replace(/^\s*export\s+default\s+function\s+/gm, 'function ');
  pre = pre.replace(/^\s*export\s+default\s+class\s+/gm, 'class ');
  pre = pre.replace(/^\s*export\s+default\s+(\w+)\s*;?\s*$/gm, '');
  pre = pre.replace(/^\s*export\s+default\s+/gm, 'var __default = ');
  pre = pre.replace(
    /^\s*export\s+(const|let|var|function|class|enum)\s+/gm,
    '$1 ',
  );
  pre = pre.replace(/^\s*export\s+(?:type|interface)\s+/gm, '');
  pre = pre.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, '');

  // 2. Transpile TS+JSX → JS using Sucrase
  const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  try {
    const out = transform(pre, {
      transforms: isTs ? ['typescript', 'jsx'] : ['jsx'],
      jsxRuntime: 'classic',
      production: false,
      filePath,
    });
    return out.code;
  } catch (e) {
    return `console.error("Transpile error in ${escapeJs(filePath)}:", ${JSON.stringify(
      String(e),
    )});`;
  }
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
