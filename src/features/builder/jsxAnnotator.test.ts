/**
 * Tests for the data-loc injector that powers Visual Edits selection.
 */
import { describe, it, expect } from 'vitest';
import { annotateJsxWithDataLoc } from './jsxAnnotator';

describe('annotateJsxWithDataLoc', () => {
  it('annotates a simple opening tag', () => {
    const src = `<button>Click</button>`;
    const out = annotateJsxWithDataLoc(src, 'src/App.tsx');
    expect(out).toBe(`<button data-loc="src/App.tsx:1:1">Click</button>`);
  });

  it('annotates capitalized component names', () => {
    const src = `<Card><Button /></Card>`;
    const out = annotateJsxWithDataLoc(src, 'src/App.tsx');
    expect(out).toContain('<Card data-loc="src/App.tsx:1:1"');
    expect(out).toContain('<Button data-loc="src/App.tsx:1:7"');
  });

  it('does not annotate closing tags', () => {
    const src = `<div></div>`;
    const out = annotateJsxWithDataLoc(src, 'a.tsx');
    // Only one annotation
    expect(out.match(/data-loc=/g)?.length).toBe(1);
  });

  it('handles multi-line JSX', () => {
    const src = `<div>\n  <span>hi</span>\n</div>`;
    const out = annotateJsxWithDataLoc(src, 'x.tsx');
    expect(out).toContain('<div data-loc="x.tsx:1:1"');
    expect(out).toContain('<span data-loc="x.tsx:2:3"');
  });

  it('skips already-annotated tags', () => {
    const src = `<button data-loc="x.tsx:1:1">x</button>`;
    const out = annotateJsxWithDataLoc(src, 'y.tsx');
    expect(out).toBe(src);
  });

  it('skips comparator-like patterns (a<b)', () => {
    const src = `const t = a<b ? 1 : 2;`;
    const out = annotateJsxWithDataLoc(src, 'z.ts');
    expect(out).toBe(src);
  });

  it('annotates dotted member tags like Tabs.Trigger', () => {
    const src = `<Tabs.Trigger>x</Tabs.Trigger>`;
    const out = annotateJsxWithDataLoc(src, 'a.tsx');
    expect(out).toContain('<Tabs.Trigger data-loc="a.tsx:1:1"');
  });
});
