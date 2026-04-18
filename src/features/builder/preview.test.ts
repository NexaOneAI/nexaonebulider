import { describe, it, expect } from 'vitest';
import { generatePreviewHtml } from './preview';
import type { GeneratedFile } from '../projects/projectTypes';

const minimalApp: GeneratedFile[] = [
  {
    path: 'src/App.tsx',
    language: 'typescript',
    content: `export default function App() { return <div>Hello</div>; }`,
  },
];

describe('generatePreviewHtml', () => {
  const html = generatePreviewHtml(minimalApp, 'Test App', 'google/gemini-3-flash-preview');

  it('includes react in the importmap', () => {
    expect(html).toMatch(/"react"\s*:\s*"https:\/\/esm\.sh\/react@/);
  });

  it('includes react/jsx-runtime in the importmap (production JSX runtime)', () => {
    expect(html).toMatch(/"react\/jsx-runtime"\s*:\s*"https:\/\/esm\.sh\/react@[^"]+\/jsx-runtime"/);
  });

  it('includes react/jsx-dev-runtime in the importmap (dev JSX runtime fallback)', () => {
    expect(html).toMatch(
      /"react\/jsx-dev-runtime"\s*:\s*"https:\/\/esm\.sh\/react@[^"]+\/jsx-dev-runtime"/,
    );
  });

  it('includes react-dom and react-dom/client in the importmap', () => {
    expect(html).toMatch(/"react-dom"\s*:\s*"https:\/\/esm\.sh\/react-dom@/);
    expect(html).toMatch(/"react-dom\/client"\s*:\s*"https:\/\/esm\.sh\/react-dom@[^"]+\/client"/);
  });

  it('declares the importmap as a script type="importmap"', () => {
    expect(html).toMatch(/<script\s+type="importmap">/);
  });

  it('renders the bootstrap script that mounts the App', () => {
    expect(html).toContain('<div id="root">');
    expect(html).toMatch(/import\s*\(\s*['"]react-dom\/client['"]\s*\)/);
  });

  it('transpiles JSX with Sucrase production:true (uses jsx-runtime, not jsx-dev-runtime)', () => {
    // production:true → emits `import { jsx as _jsx } from "react/jsx-runtime"` and uses _jsx(...)
    // production:false → emits `import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime"` and uses _jsxDEV(...)
    expect(html).toContain('react/jsx-runtime');
    expect(html).not.toMatch(/from\s*['"]react\/jsx-dev-runtime['"]/);
    expect(html).not.toMatch(/\b_?jsxDEV\s*\(/);
    // And the production helper IS present in the transpiled App
    expect(html).toMatch(/\b_?jsxs?\s*\(/);
  });

  it('falls back to a static page when App.tsx is missing', () => {
    const html = generatePreviewHtml(
      [{ path: 'src/utils.ts', language: 'typescript', content: 'export const a = 1;' }],
      'Fallback',
      'x',
    );
    expect(html).toContain('Fallback');
    expect(html).not.toMatch(/<script\s+type="importmap">/);
  });
});
