import { describe, it, expect } from 'vitest';
import { extractDependencies, isBareSpecifier, packageRoot } from './sandboxDeps';
import type { GeneratedFile } from '../projects/projectTypes';

const file = (path: string, content: string): GeneratedFile => ({
  path,
  content,
  language: 'tsx',
});

describe('isBareSpecifier', () => {
  it('detects npm packages', () => {
    expect(isBareSpecifier('react')).toBe(true);
    expect(isBareSpecifier('@tanstack/react-query')).toBe(true);
    expect(isBareSpecifier('lucide-react/icons')).toBe(true);
  });
  it('rejects relative and alias imports', () => {
    expect(isBareSpecifier('./foo')).toBe(false);
    expect(isBareSpecifier('../bar')).toBe(false);
    expect(isBareSpecifier('@/components/ui/button')).toBe(false);
    expect(isBareSpecifier('/abs')).toBe(false);
  });
});

describe('packageRoot', () => {
  it('strips sub-paths', () => {
    expect(packageRoot('lucide-react/icons/X')).toBe('lucide-react');
    expect(packageRoot('@scope/pkg/sub/path')).toBe('@scope/pkg');
    expect(packageRoot('react')).toBe('react');
  });
});

describe('extractDependencies', () => {
  it('collects bare imports and pins known versions', () => {
    const files: GeneratedFile[] = [
      file(
        'src/App.tsx',
        `import React from 'react';
         import { Button } from '@/components/ui/button';
         import { Search } from 'lucide-react';
         import { useQuery } from '@tanstack/react-query';
         import './styles.css';`,
      ),
    ];
    const deps = extractDependencies(files);
    expect(deps['react']).toBe('18.3.1');
    expect(deps['lucide-react']).toBe('0.462.0');
    expect(deps['@tanstack/react-query']).toBe('5.56.2');
    expect(deps['react-dom']).toBe('18.3.1');
    expect(deps['@/components/ui/button']).toBeUndefined();
  });

  it('falls back to "latest" for unknown packages', () => {
    const files: GeneratedFile[] = [
      file('src/x.tsx', `import foo from 'super-rare-pkg';`),
    ];
    const deps = extractDependencies(files);
    expect(deps['super-rare-pkg']).toBe('latest');
  });

  it('captures dynamic imports', () => {
    const files: GeneratedFile[] = [
      file('src/x.tsx', `const m = await import('zod');`),
    ];
    const deps = extractDependencies(files);
    expect(deps['zod']).toBe('3.23.8');
  });

  it('skips react/jsx-runtime sub-path noise', () => {
    const files: GeneratedFile[] = [
      file('src/x.tsx', `import 'react/jsx-runtime';`),
    ];
    const deps = extractDependencies(files);
    // still includes 'react' from the always-included set, but no spurious key
    expect(deps['react']).toBeDefined();
    expect(Object.keys(deps).filter((k) => k.startsWith('react/'))).toHaveLength(0);
  });
});
