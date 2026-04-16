import type { GeneratedFile } from '../projects/projectTypes';

/**
 * Generate a REAL live preview HTML that renders the React app
 * inside an iframe using UMD React + Babel standalone
 */
export function generatePreviewHtml(
  files: GeneratedFile[],
  projectName: string,
  _model: string
): string {
  const appFile = files.find(
    (f) => f.path === 'src/App.tsx' || f.path === 'src/App.jsx' || f.path === 'App.tsx' || f.path === 'App.jsx'
  );

  if (!appFile) {
    return generateFallbackPreview(files, projectName);
  }

  // Collect all component files (non-App, non-main)
  const componentFiles = files.filter(
    (f) =>
      (f.path.endsWith('.tsx') || f.path.endsWith('.jsx')) &&
      !f.path.includes('main.') &&
      f.path !== appFile.path
  );

  // Find CSS files
  const cssContent = files
    .filter((f) => f.path.endsWith('.css'))
    .map((f) => f.content)
    .join('\n');

  // Build component scripts
  const componentScripts = componentFiles
    .map(
      (f) =>
        `<script type="text/babel" data-presets="react,typescript">
${transformForPreview(f.content)}
<\/script>`
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
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
    }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  ${componentScripts}
  <script type="text/babel" data-presets="react,typescript">
    ${transformForPreview(appFile.content)}

    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    } catch (e) {
      document.getElementById('root').innerHTML = 
        '<div style="padding:2rem;font-family:monospace;color:#ef4444;background:#1e1e1e;min-height:100vh">' +
        '<h2 style="color:#f97316;margin-bottom:1rem">⚠️ Preview Error</h2>' +
        '<pre style="white-space:pre-wrap;font-size:13px">' + e.message + '</pre></div>';
    }
  <\/script>
</body>
</html>`;
}

/**
 * Transform TSX/JSX content for browser preview:
 * - Remove import statements (we use UMD globals)
 * - Remove export statements
 * - Replace hooks references
 * - Strip TypeScript annotations more aggressively
 */
function transformForPreview(content: string): string {
  let code = content;

  // Remove import lines (multiline too)
  code = code.replace(/^import\s+[\s\S]*?from\s+['"][^'"]*['"];?\s*$/gm, '');
  code = code.replace(/^import\s+['"][^'"]*['"];?\s*$/gm, '');

  // Remove TypeScript interfaces and type aliases BEFORE other transforms
  code = code.replace(/^(?:export\s+)?interface\s+\w+\s*(?:extends\s+[^{]*)?\{[^}]*\}/gm, '');
  code = code.replace(/^(?:export\s+)?type\s+\w+\s*=\s*(?:\{[^}]*\}|[^;]+);/gm, '');

  // Replace "export default function" with "function"
  code = code.replace(/export\s+default\s+function\s+/g, 'function ');
  // Replace "export default" at the end
  code = code.replace(/export\s+default\s+(\w+);?\s*$/gm, '');
  // Replace "export function"
  code = code.replace(/export\s+function\s+/g, 'function ');
  // Replace "export const"
  code = code.replace(/export\s+const\s+/g, 'const ');

  // Use React globals for hooks
  code = code.replace(
    /\b(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer|Fragment)\b/g,
    'React.$1'
  );

  // Remove TypeScript type annotations
  // Function parameter types: (x: string, y: number)
  code = code.replace(/(\w+)\s*:\s*(?:string|number|boolean|any|void|null|undefined|object|never|unknown)(?:\[\])?\s*(?=[,)\]=])/g, '$1');
  // Return type annotations
  code = code.replace(/\)\s*:\s*(?:React\.)?(?:JSX\.Element|FC|ReactNode|ReactElement|string|number|boolean|void|any|null|undefined)(?:\s*\|[^{=]*?)?(?=\s*[{=])/g, ')');
  // Generic type parameters on functions
  code = code.replace(/<(?:string|number|boolean|any|void|null|undefined|[A-Z]\w*(?:Props|Type|State|Config|Options)?)(?:\s*,\s*(?:string|number|boolean|any|[A-Z]\w*))*>/g, '');
  // Type assertions: as SomeType
  code = code.replace(/\s+as\s+\w+(?:\[\])?/g, '');
  // React.FC<Props> type annotation
  code = code.replace(/:\s*React\.FC(?:<[^>]*>)?/g, '');
  // Standalone React.FC<Props> = 
  code = code.replace(/React\.FC(?:<[^>]*>)?\s*=\s*/g, '');

  // Remove `satisfies` operator  
  code = code.replace(/\s+satisfies\s+\w+(?:<[^>]*>)?/g, '');

  // Remove blank lines clusters
  code = code.replace(/\n{3,}/g, '\n\n');

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
    <p class="text-gray-400 mb-6">${files.length} archivos generados</p>
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
