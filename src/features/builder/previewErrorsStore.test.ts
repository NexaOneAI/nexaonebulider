import { describe, it, expect, beforeEach } from 'vitest';
import { usePreviewErrorsStore, buildFixPrompt } from './previewErrorsStore';

describe('previewErrorsStore', () => {
  beforeEach(() => {
    usePreviewErrorsStore.getState().clear();
  });

  it('agrupa errores idénticos por signature', () => {
    const store = usePreviewErrorsStore.getState();
    store.push({ message: 'foo is not defined', stack: 'at Bar (blob:abc:10:5)' });
    store.push({ message: 'foo is not defined', stack: 'at Bar (blob:def:10:5)' });
    store.push({ message: 'foo is not defined', stack: 'at Bar (blob:xyz:10:5)' });

    const errors = usePreviewErrorsStore.getState().errors;
    expect(errors).toHaveLength(1);
    expect(errors[0].occurrences).toHaveLength(3);
  });

  it('crea entries separadas para errores distintos', () => {
    const store = usePreviewErrorsStore.getState();
    store.push({ message: 'foo is not defined', stack: 'at A' });
    store.push({ message: 'bar is not a function', stack: 'at B' });
    expect(usePreviewErrorsStore.getState().errors).toHaveLength(2);
  });

  it('infiere archivo y línea del stack', () => {
    const store = usePreviewErrorsStore.getState();
    const entry = store.push({
      message: 'Cannot read properties of undefined',
      stack: 'at render (src/components/Foo.tsx:42:10)\n  at App',
    });
    expect(entry.inferredFile).toBe('src/components/Foo.tsx');
    expect(entry.inferredLine).toBe(42);
  });

  it('infiere archivo desde alias @/', () => {
    const store = usePreviewErrorsStore.getState();
    const entry = store.push({
      message: 'Module not found: @/lib/missing',
      stack: '',
    });
    expect(entry.inferredFile).toBe('src/lib/missing');
  });

  it('latest() devuelve el más reciente', () => {
    const store = usePreviewErrorsStore.getState();
    store.push({ message: 'A' });
    store.push({ message: 'B' });
    store.push({ message: 'C' });
    expect(usePreviewErrorsStore.getState().latest()?.message).toBe('C');
  });

  it('limita a MAX_ERRORS=25', () => {
    const store = usePreviewErrorsStore.getState();
    for (let i = 0; i < 30; i++) {
      store.push({ message: `error ${i}`, stack: `frame ${i}` });
    }
    expect(usePreviewErrorsStore.getState().errors.length).toBeLessThanOrEqual(25);
  });

  it('remove() elimina por id', () => {
    const store = usePreviewErrorsStore.getState();
    const e1 = store.push({ message: 'A' });
    store.push({ message: 'B' });
    store.remove(e1.id);
    const errors = usePreviewErrorsStore.getState().errors;
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('B');
  });
});

describe('buildFixPrompt', () => {
  it('incluye archivo sospechoso si está en files', () => {
    const err = {
      id: '1',
      message: 'Cannot read x',
      stack: 'at render (src/components/Foo.tsx:5:1)',
      inferredFile: 'src/components/Foo.tsx',
      inferredLine: 5,
      occurrences: [Date.now()],
      firstAt: Date.now(),
      lastAt: Date.now(),
    };
    const prompt = buildFixPrompt(err, [
      { path: 'src/components/Foo.tsx', content: 'export const Foo = () => null;' },
    ]);
    expect(prompt).toContain('src/components/Foo.tsx');
    expect(prompt).toContain('export const Foo');
  });

  it('omite archivo si no se infirió', () => {
    const err = {
      id: '1',
      message: 'Generic error',
      stack: '',
      inferredFile: null,
      inferredLine: null,
      occurrences: [Date.now()],
      firstAt: Date.now(),
      lastAt: Date.now(),
    };
    const prompt = buildFixPrompt(err, []);
    expect(prompt).toContain('Generic error');
    expect(prompt).not.toContain('Archivo sospechoso');
  });

  it('menciona repeticiones cuando hay múltiples occurrences', () => {
    const err = {
      id: '1',
      message: 'spam',
      stack: '',
      inferredFile: null,
      inferredLine: null,
      occurrences: [1, 2, 3, 4, 5],
      firstAt: 1,
      lastAt: 5,
    };
    const prompt = buildFixPrompt(err, []);
    expect(prompt).toContain('5 veces');
  });
});
