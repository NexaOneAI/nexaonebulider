import type { GeneratedFile } from '../projects/projectTypes';

/**
 * Generate HTML preview from generated files
 */
export function generatePreviewHtml(files: GeneratedFile[], projectName: string, model: string): string {
  // Find App.tsx or main component
  const appFile = files.find((f) => f.path.includes('App.tsx') || f.path.includes('App.jsx'));
  const content = appFile?.content || 'No content generated';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #0a0a0f;
      color: #e2e8f0;
      padding: 2rem;
      min-height: 100vh;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #f1f5f9; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 0.75rem; }
    pre {
      background: #1e293b;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: #93c5fd;
      margin-top: 1rem;
    }
    .badge {
      display: inline-block;
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <h1>${projectName}</h1>
  <p>Generado con <strong>${model}</strong> por Nexa One Builder</p>
  <span class="badge">${files.length} archivos generados</span>
  <h2 style="margin-top:1.5rem">Vista previa del código</h2>
  <pre>${escapeHtml(content)}</pre>
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
