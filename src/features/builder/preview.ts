import type { GeneratedFile } from '../projects/projectTypes';

/**
 * Generate a REAL live preview HTML that renders the React app
 * inside an iframe using ESM imports from esm.sh CDN
 */
export function generatePreviewHtml(
  files: GeneratedFile[],
  projectName: string,
  _model: string
): string {
  const appFile = files.find(
    (f) => f.path === 'src/App.tsx' || f.path === 'src/App.jsx'
  );

  if (!appFile) {
    return generateFallbackPreview(files, projectName);
  }

  // Extract JSX content from the App component
  const appContent = appFile.content;

  // Find CSS files
  const cssFiles = files.filter(
    (f) => f.path.endsWith('.css') && f.path !== 'src/index.css'
  );
  const cssContent = cssFiles.map((f) => f.content).join('\n');

  // Find index.css
  const indexCss = files.find((f) => f.path === 'src/index.css');

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
    ${indexCss?.content || ''}
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script type="text/babel" data-type="module">
    ${transformForPreview(appContent)}

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  <\/script>
</body>
</html>`;
}

/**
 * Transform TSX/JSX content for browser preview:
 * - Remove import statements (we use UMD globals)
 * - Remove export statements
 * - Replace hooks references
 */
function transformForPreview(content: string): string {
  let code = content;

  // Remove import lines
  code = code.replace(/^import\s+.*?(?:from\s+['"].*?['"]|['"].*?['"]);?\s*$/gm, '');

  // Replace "export default function" with "function"
  code = code.replace(/export\s+default\s+function\s+/g, 'function ');
  // Replace "export default" at the end
  code = code.replace(/export\s+default\s+(\w+);?\s*$/gm, '');
  // Replace "export function" 
  code = code.replace(/export\s+function\s+/g, 'function ');
  // Replace "export const"
  code = code.replace(/export\s+const\s+/g, 'const ');

  // Use React globals for hooks
  code = code.replace(/\b(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer)\b/g, 'React.$1');

  // Remove TypeScript type annotations for browser compatibility
  code = code.replace(/:\s*React\.FC(?:<[^>]*>)?/g, '');
  code = code.replace(/:\s*(?:string|number|boolean|any|void|null|undefined)(?:\[\])?/g, '');
  code = code.replace(/<[A-Z]\w*(?:Props|Type|Interface)>/g, '');
  code = code.replace(/interface\s+\w+\s*\{[^}]*\}/g, '');
  code = code.replace(/type\s+\w+\s*=\s*[^;]+;/g, '');

  return code;
}

/**
 * Fallback preview when App.tsx is not found
 */
function generateFallbackPreview(files: GeneratedFile[], projectName: string): string {
  const fileList = files.map((f) => `<li>${escapeHtml(f.path)}</li>`).join('');

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
