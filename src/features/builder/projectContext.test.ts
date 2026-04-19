import { describe, it, expect } from 'vitest';
import {
  extractRoutes,
  extractComponents,
  extractDesignTokens,
  extractDependencies,
  buildFileTree,
  summarizeProject,
  renderProjectContext,
  buildProjectContext,
  type ProjectFile,
} from '../../../supabase/functions/_shared/projectContext';

const sampleFiles: ProjectFile[] = [
  {
    path: 'src/App.tsx',
    content: `
      import { Route, Routes } from 'react-router-dom';
      import Home from './pages/Home';
      export default function App() {
        return (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        );
      }
    `,
  },
  {
    path: 'src/pages/Home.tsx',
    content: `export default function Home() { return <div>Home</div>; }`,
  },
  {
    path: 'src/components/Button.tsx',
    content: `export const Button = (props: any) => <button {...props} />;`,
  },
  {
    path: 'src/index.css',
    content: `
      :root {
        --primary: 200 90% 48%;
        --background: 220 20% 4%;
        --gradient-hero: linear-gradient(...);
        --random-non-color: 12px;
      }
    `,
  },
  {
    path: 'package.json',
    content: JSON.stringify({
      dependencies: {
        react: '^18.0.0',
        'react-router-dom': '^6.0.0',
        '@tanstack/react-query': '^5.0.0',
        'some-random-pkg': '^1.0.0',
      },
    }),
  },
];

describe('projectContext', () => {
  it('extracts routes from JSX', () => {
    const routes = extractRoutes(sampleFiles);
    expect(routes).toContain('/');
    expect(routes).toContain('/login');
  });

  it('extracts top-level components', () => {
    const comps = extractComponents(sampleFiles);
    expect(comps).toContain('App');
    expect(comps).toContain('Home');
    expect(comps).toContain('Button');
  });

  it('extracts only color/design CSS tokens', () => {
    const tokens = extractDesignTokens(sampleFiles);
    expect(tokens.some((t) => t.includes('--primary'))).toBe(true);
    expect(tokens.some((t) => t.includes('--background'))).toBe(true);
    expect(tokens.some((t) => t.includes('--gradient-hero'))).toBe(true);
    expect(tokens.some((t) => t.includes('--random-non-color'))).toBe(false);
  });

  it('filters dependencies to interesting ones', () => {
    const deps = extractDependencies(sampleFiles);
    expect(deps).toContain('react');
    expect(deps).toContain('react-router-dom');
    expect(deps).toContain('@tanstack/react-query');
    expect(deps).not.toContain('some-random-pkg');
  });

  it('builds file tree grouped by directory', () => {
    const tree = buildFileTree(sampleFiles);
    expect(tree.some((l) => l.startsWith('src/'))).toBe(true);
    expect(tree.some((l) => l.includes('App.tsx'))).toBe(true);
  });

  it('renders complete context under char limit', () => {
    const summary = summarizeProject(sampleFiles);
    const rendered = renderProjectContext(summary);
    expect(rendered).toContain('# Project Context');
    expect(rendered).toContain('## Routes');
    expect(rendered).toContain('## Components');
    expect(rendered).toContain('## Design tokens');
    expect(rendered.length).toBeLessThan(7000);
  });

  it('truncates oversized contexts', () => {
    const huge: ProjectFile[] = Array.from({ length: 500 }, (_, i) => ({
      path: `src/components/Comp${i}.tsx`,
      content: `export default function Comp${i}() { return <div/>; }`,
    }));
    const out = buildProjectContext(huge);
    expect(out.length).toBeLessThanOrEqual(6100);
  });

  it('handles empty file list gracefully', () => {
    const out = buildProjectContext([]);
    expect(out).toContain('# Project Context');
  });
});
