/**
 * Tests for the client-side mirror of the SEARCH/REPLACE applier.
 * Mirrors the cases in supabase/functions/_shared/searchReplace.test.ts so
 * a divergence between server and client behavior fails CI.
 */
import { describe, it, expect } from 'vitest';
import { applyBlock } from './searchReplaceClient';

describe('searchReplaceClient.applyBlock', () => {
  it('does an exact replace', () => {
    expect(applyBlock('hello world', { search: 'world', replace: 'there' }))
      .toBe('hello there');
  });

  it('treats empty SEARCH as full-content replace (used by create)', () => {
    expect(applyBlock('whatever', { search: '', replace: 'brand new' }))
      .toBe('brand new');
  });

  it('returns null when SEARCH is missing entirely', () => {
    expect(applyBlock('hello', { search: 'nope', replace: 'x' })).toBeNull();
  });

  it('matches even when trailing whitespace differs', () => {
    const content = 'const a = 1;   \nconst b = 2;\n';
    const out = applyBlock(content, {
      search: 'const a = 1;\nconst b = 2;',
      replace: 'const a = 99;\nconst b = 2;',
    });
    expect(out).not.toBeNull();
    expect(out).toContain('const a = 99;');
  });

  it('matches with indentation drift and reindents replacement', () => {
    const content = `function f() {\n    const a = 1;\n    return a;\n}`;
    const out = applyBlock(content, {
      search: 'const a = 1;\nreturn a;',
      replace: 'const a = 2;\nreturn a + 1;',
    });
    expect(out).not.toBeNull();
    // Replacement should keep the 4-space indent of the original block
    expect(out).toContain('    const a = 2;');
    expect(out).toContain('    return a + 1;');
  });

  it('only replaces the first occurrence (deterministic)', () => {
    const out = applyBlock('a a a', { search: 'a', replace: 'b' });
    expect(out).toBe('b a a');
  });

  it('handles multiline JSX blocks unchanged byte-for-byte', () => {
    const content = `<button className="bg-blue-500">Click</button>`;
    const out = applyBlock(content, {
      search: 'bg-blue-500',
      replace: 'bg-green-500',
    });
    expect(out).toBe('<button className="bg-green-500">Click</button>');
  });
});
