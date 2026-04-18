import type { GeneratedFile } from '../projects/projectTypes';

/**
 * Generate a REAL live preview HTML that renders the React app
 * inside an iframe. We let Babel Standalone (with the TS preset plugin)
 * compile TSX/JSX in the browser. We only strip imports/exports and
 * rewrite hook references — no manual TS-stripping (that was fragile).
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

  // Component files — order: types first, then components, App last
  const otherFiles = files.filter(
    (f) =>
      (f.path.endsWith('.tsx') ||
        f.path.endsWith('.jsx') ||
        f.path.endsWith('.ts') ||
        f.path.endsWith('.js')) &&
      !f.path.includes('main.') &&
      !f.path.endsWith('.d.ts') &&
      f.path !== appFile.path,
  );

  // Sort: .ts/.js (types/utils) first, then .tsx/.jsx (components)
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
    .map(
      (f) =>
        `<script type="text/babel" data-presets="react,typescript" data-plugins="transform-modules-umd">
${stripImportsExports(f.content)}
<\/script>`,
    )
    .join('\n');

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
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script>
    // Expose React hooks/types at global scope so transformed code (which
    // had its imports stripped) can still reference them as bare identifiers.
    (function () {
      var R = window.React;
      ['useState','useEffect','useCallback','useMemo','useRef','useContext',
       'useReducer','useLayoutEffect','Fragment','createContext','forwardRef',
       'memo','Suspense','lazy','Children','cloneElement','isValidElement']
        .forEach(function (k) { window[k] = R[k]; });
      window.ReactDOM = window.ReactDOM;
    })();

    // Catch errors and render them nicely
    window.addEventListener('error', function (e) {
      var root = document.getElementById('root');
      if (root && !root.hasChildNodes()) {
        root.innerHTML =
          '<div style="padding:2rem;font-family:ui-monospace,monospace;color:#ef4444;background:#0f172a;min-height:100vh">' +
          '<h2 style="color:#f97316;margin-bottom:1rem;font-family:Inter,sans-serif">⚠️ Preview Error</h2>' +
          '<pre style="white-space:pre-wrap;font-size:13px;color:#fca5a5">' +
          (e.message || 'Unknown error') + '</pre></div>';
      }
    });
  <\/script>
  ${componentScripts}
  <script type="text/babel" data-presets="react,typescript">
${stripImportsExports(appFile.content)}

    try {
      var rootEl = document.getElementById('root');
      var root = ReactDOM.createRoot(rootEl);
      root.render(React.createElement(App));
    } catch (e) {
      document.getElementById('root').innerHTML =
        '<div style="padding:2rem;font-family:ui-monospace,monospace;color:#ef4444;background:#0f172a;min-height:100vh">' +
        '<h2 style="color:#f97316;margin-bottom:1rem;font-family:Inter,sans-serif">⚠️ Preview Error</h2>' +
        '<pre style="white-space:pre-wrap;font-size:13px;color:#fca5a5">' + (e.message || e) + '</pre></div>';
    }
  <\/script>
</body>
</html>`;
}

/**
 * Strip ES module syntax (Babel's TS preset can't resolve module imports
 * in browser). We KEEP the rest of the code intact so Babel can handle
 * all TypeScript/JSX faithfully.
 *
 * Special-case: `import X from 'react'` and named imports from 'react'
 * are unnecessary because we exposed React + hooks as globals.
 */
function stripImportsExports(src: string): string {
  let code = src;

  // Drop ALL import statements (we expose React as a global)
  code = code.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  code = code.replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '');

  // Replace `export default function Foo` with `function Foo`
  code = code.replace(/^\s*export\s+default\s+function\s+/gm, 'function ');
  // Replace `export default X;` (assignment-like) with nothing
  code = code.replace(/^\s*export\s+default\s+\w+\s*;?\s*$/gm, '');
  // Replace `export default <expr>` with `var __default = <expr>`
  code = code.replace(/^\s*export\s+default\s+/gm, 'var __default = ');
  // Strip `export ` keyword from declarations (keep the declaration)
  code = code.replace(/^\s*export\s+(const|let|var|function|class|interface|type|enum)\s+/gm, '$1 ');
  // Strip leftover `export { ... };`
  code = code.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, '');

  return code;
}

/**
 * Fallback preview when App.tsx is not found
 */
function generateFallbackPreview(files: GeneratedFile[], projectName: string): string {
  const fileList = files.map((f) => `<li class="py-0.5">${escapeHtml(f.path)}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(projectName)}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
</head>
<body class="bg-gray-950 text-gray-100 font-[Inter] min-h-screen flex items-center justify-center">
  <div class="text-center max-w-md mx-auto p-8">
    <div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
      <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
      </svg>
    </div>
    <h1 class="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent mb-2">${escapeHtml(projectName)}</h1>
    <p class="text-gray-400 mb-6">${files.length} archivos generados (no se encontró App.tsx)</p>
    <ul class="text-left text-sm text-gray-500 space-y-1 bg-gray-900 rounded-lg p-4 font-mono">${fileList}</ul>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
