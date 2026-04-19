/**
 * Detect bare-specifier imports across all generated files and build the
 * dependency map Sandpack needs in its virtual package.json.
 *
 * Only "bare" imports count (e.g. `react`, `lucide-react`, `@tanstack/react-query`).
 * Relative (`./`, `../`) and aliased (`@/...`) imports are local files.
 */
import type { GeneratedFile } from '../projects/projectTypes';

/** Pinned versions matching the importmap in `preview.ts` so both engines agree. */
const PINNED: Record<string, string> = {
  react: '18.3.1',
  'react-dom': '18.3.1',
  'react-router-dom': '6.26.2',
  'lucide-react': '0.462.0',
  'framer-motion': '11.11.0',
  recharts: '2.12.7',
  clsx: '2.1.1',
  'tailwind-merge': '2.5.4',
  'class-variance-authority': '0.7.1',
  sonner: '1.5.0',
  'date-fns': '3.6.0',
  zod: '3.23.8',
  zustand: '4.5.5',
  '@tanstack/react-query': '5.56.2',
  'react-hook-form': '7.53.0',
};

const IMPORT_RE = /(?:from|import)\s*['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** True when a specifier is a npm bare import (not relative, not aliased). */
export function isBareSpecifier(spec: string): boolean {
  if (!spec) return false;
  if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/')) return false;
  if (spec.startsWith('@/')) return false; // alias
  return true;
}

/** Normalise `lucide-react/icons/Foo` → `lucide-react`, `@scope/pkg/sub` → `@scope/pkg`. */
export function packageRoot(spec: string): string {
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.slice(0, 2).join('/');
  }
  return spec.split('/')[0];
}

export function extractDependencies(files: GeneratedFile[]): Record<string, string> {
  const found = new Set<string>();

  for (const f of files) {
    if (
      !f.path.endsWith('.tsx') &&
      !f.path.endsWith('.ts') &&
      !f.path.endsWith('.jsx') &&
      !f.path.endsWith('.js')
    )
      continue;

    for (const re of [IMPORT_RE, DYNAMIC_IMPORT_RE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(f.content)) !== null) {
        const spec = m[1];
        if (!isBareSpecifier(spec)) continue;
        // skip jsx-runtime / jsx-dev-runtime sub-paths handled by Sandpack itself
        if (spec.startsWith('react/jsx')) continue;
        found.add(packageRoot(spec));
      }
    }
  }

  // React + ReactDOM are always required by the bootstrap
  found.add('react');
  found.add('react-dom');

  const deps: Record<string, string> = {};
  for (const pkg of found) {
    deps[pkg] = PINNED[pkg] ?? 'latest';
  }
  return deps;
}
