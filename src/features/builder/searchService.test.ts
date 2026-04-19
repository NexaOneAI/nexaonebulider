import { describe, expect, it } from 'vitest';
import { fuzzyMatch, searchContent, searchFilesByName } from './searchService';
import type { GeneratedFile } from '../projects/projectTypes';

const files: GeneratedFile[] = [
  { path: 'src/App.tsx', content: 'import React from "react";\nexport default function App() { return null; }', language: 'tsx' },
  { path: 'src/components/Button.tsx', content: 'export function Button() {\n  return <button>Click</button>;\n}', language: 'tsx' },
  { path: 'src/lib/utils.ts', content: 'export function cn() { return ""; }\nexport const HELLO = "world";', language: 'ts' },
];

describe('fuzzyMatch', () => {
  it('returns null when chars are missing', () => {
    expect(fuzzyMatch('xyz', 'abc')).toBeNull();
  });
  it('matches in order', () => {
    const r = fuzzyMatch('btn', 'Button.tsx');
    expect(r).not.toBeNull();
    expect(r!.indices.length).toBe(3);
  });
  it('prefers start matches', () => {
    const a = fuzzyMatch('app', 'App.tsx')!;
    const b = fuzzyMatch('app', 'src/App.tsx')!;
    expect(a.score).toBeLessThan(b.score);
  });
});

describe('searchFilesByName', () => {
  it('finds files by partial name', () => {
    const r = searchFilesByName('butt', files);
    expect(r[0].file.path).toBe('src/components/Button.tsx');
  });
  it('returns all when query empty', () => {
    expect(searchFilesByName('', files).length).toBe(3);
  });
  it('returns empty for no matches', () => {
    expect(searchFilesByName('zzzqqq', files).length).toBe(0);
  });
});

describe('searchContent', () => {
  it('finds substring matches with line/column', () => {
    const r = searchContent('Button', files);
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r[0].file.path).toBe('src/components/Button.tsx');
    expect(r[0].line).toBeGreaterThan(0);
  });
  it('respects case sensitivity', () => {
    const insensitive = searchContent('hello', files);
    const sensitive = searchContent('hello', files, { caseSensitive: true });
    expect(insensitive.length).toBeGreaterThan(0);
    expect(sensitive.length).toBe(0);
  });
  it('returns highlight range matching the query', () => {
    const r = searchContent('Click', files);
    const m = r[0];
    expect(m.preview.slice(m.highlight[0], m.highlight[1])).toBe('Click');
  });
  it('respects limit', () => {
    const r = searchContent('e', files, { limit: 3 });
    expect(r.length).toBe(3);
  });
});
