import { describe, it, expect } from 'vitest';

// Mirror of the edge-function module so we can unit-test the parser/applier
// without spinning up Deno. Keep these in sync with
// supabase/functions/_shared/searchReplace.ts
import {
  parseSearchReplaceText,
  applyEdits,
  applyBlock,
} from '../../../supabase/functions/_shared/searchReplace.ts';

describe('SEARCH/REPLACE parser', () => {
  it('parses a single modify block', () => {
    const raw = `### src/App.tsx
ACTION: modify
LANG: tsx
<<<<<<< SEARCH
const a = 1;
=======
const a = 2;
>>>>>>> REPLACE`;
    const edits = parseSearchReplaceText(raw);
    expect(edits).toHaveLength(1);
    expect(edits[0].path).toBe('src/App.tsx');
    expect(edits[0].action).toBe('modify');
    expect(edits[0].blocks[0]).toEqual({
      search: 'const a = 1;',
      replace: 'const a = 2;',
    });
  });

  it('parses multiple blocks per file and multiple files', () => {
    const raw = `### a.ts
ACTION: modify
LANG: ts
<<<<<<< SEARCH
foo
=======
bar
>>>>>>> REPLACE
<<<<<<< SEARCH
baz
=======
qux
>>>>>>> REPLACE
### b.ts
ACTION: delete
LANG: ts`;
    const edits = parseSearchReplaceText(raw);
    expect(edits).toHaveLength(2);
    expect(edits[0].blocks).toHaveLength(2);
    expect(edits[1].action).toBe('delete');
  });
});

describe('applyBlock', () => {
  it('does an exact replace', () => {
    const out = applyBlock('hello world', { search: 'world', replace: 'there' });
    expect(out).toBe('hello there');
  });

  it('returns null when search is missing', () => {
    expect(applyBlock('hello', { search: 'nope', replace: 'x' })).toBeNull();
  });

  it('matches with indentation drift', () => {
    const content = `function f() {\n    const a = 1;\n    return a;\n}`;
    const block = { search: 'const a = 1;\nreturn a;', replace: 'const a = 2;\nreturn a + 1;' };
    const out = applyBlock(content, block);
    expect(out).not.toBeNull();
    expect(out).toContain('const a = 2;');
  });
});

describe('applyEdits', () => {
  const baseline = [
    { path: 'a.ts', content: 'export const x = 1;\n', language: 'ts' },
    { path: 'b.ts', content: 'export const y = 2;\n', language: 'ts' },
  ];

  it('applies modify + create + delete', () => {
    const edits = parseSearchReplaceText(`### a.ts
ACTION: modify
LANG: ts
<<<<<<< SEARCH
export const x = 1;
=======
export const x = 42;
>>>>>>> REPLACE
### b.ts
ACTION: delete
LANG: ts
### c.ts
ACTION: create
LANG: ts
<<<<<<< SEARCH
=======
export const z = 'new';
>>>>>>> REPLACE`);
    const res = applyEdits(baseline, edits);
    expect(res.failed).toHaveLength(0);
    expect(res.files.find((f) => f.path === 'a.ts')?.content).toContain('= 42');
    expect(res.files.find((f) => f.path === 'b.ts')).toBeUndefined();
    expect(res.files.find((f) => f.path === 'c.ts')?.content).toContain("'new'");
    expect(res.bytesSaved).toBeGreaterThanOrEqual(0);
  });

  it('records failed blocks when SEARCH does not match', () => {
    const edits = parseSearchReplaceText(`### a.ts
ACTION: modify
LANG: ts
<<<<<<< SEARCH
const NOT_THERE = 1;
=======
const NOT_THERE = 2;
>>>>>>> REPLACE`);
    const res = applyEdits(baseline, edits);
    expect(res.applied).toBe(0);
    expect(res.failed).toHaveLength(1);
    expect(res.failed[0].reason).toMatch(/SEARCH/);
  });
});
