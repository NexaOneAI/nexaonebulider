import { describe, it, expect } from 'vitest';
import { replaceClasses, prefixesForToken } from './tailwindMap';

describe('tailwindMap.replaceClasses', () => {
  it('removes tokens matching a prefix and appends new ones', () => {
    const out = replaceClasses('p-2 bg-red-500 text-white', ['bg-'], ['bg-blue-500']);
    expect(out.split(' ')).toEqual(['p-2', 'text-white', 'bg-blue-500']);
  });

  it('keeps unrelated classes untouched', () => {
    const out = replaceClasses('flex items-center bg-red-500', ['bg-'], ['bg-green-500']);
    expect(out).toContain('flex');
    expect(out).toContain('items-center');
    expect(out).toContain('bg-green-500');
    expect(out).not.toContain('bg-red-500');
  });

  it('dedupes duplicate added classes', () => {
    const out = replaceClasses('text-sm', [], ['text-sm', 'text-sm']);
    expect(out.split(' ').filter((t) => t === 'text-sm').length).toBe(1);
  });

  it('handles empty input', () => {
    expect(replaceClasses('', [], ['bg-blue-500'])).toBe('bg-blue-500');
  });

  it('removes a class with no replacement', () => {
    const out = replaceClasses('p-2 bg-red-500', ['bg-'], []);
    expect(out).toBe('p-2');
  });
});

describe('tailwindMap.prefixesForToken', () => {
  it('returns spacing prefix for spacing tokens', () => {
    expect(prefixesForToken('p-4')).toEqual(['p-']);
    expect(prefixesForToken('mx-2')).toEqual(['mx-']);
    expect(prefixesForToken('gap-1')).toEqual(['gap-']);
  });

  it('returns the full bg palette for a bg color token', () => {
    const out = prefixesForToken('bg-red-500');
    expect(out).toContain('bg-red-500');
    expect(out).toContain('bg-blue-500');
  });

  it('returns the font-size palette for a size token', () => {
    const out = prefixesForToken('text-lg');
    expect(out).toContain('text-xs');
    expect(out).toContain('text-7xl');
  });

  it('returns empty array for unknown tokens', () => {
    expect(prefixesForToken('flex')).toEqual([]);
  });
});
