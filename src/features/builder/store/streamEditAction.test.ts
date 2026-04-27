/**
 * Tests de integración para runStreamEdit.
 *
 * Verifican el contrato A/B:
 *   - 'progressive': cada `onBlock` debe mutar `files` y regenerar el preview.
 *   - 'tokens-only':  los bloques NO deben mutar `files`/preview hasta el
 *     evento `done` final del servidor.
 *
 * Mockeamos `editAppStream` para emitir eventos sintéticos sin tocar la red,
 * y `generatePreviewHtml` para contar invocaciones de forma barata.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runStreamEdit } from './streamEditAction';
import type { ExtendedBuilderState } from '../builderTypes';
import type { GeneratedFile } from '@/features/projects/projectTypes';

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('@/features/ai/editStreamClient', () => ({
  editAppStream: vi.fn(),
}));

vi.mock('@/features/builder/preview', () => ({
  generatePreviewHtml: vi.fn(() => '<html>preview</html>'),
}));

vi.mock('@/features/auth/authStore', () => ({
  useAuthStore: {
    getState: () => ({ refreshProfile: () => Promise.resolve() }),
  },
}));

vi.mock('@/features/builder/streamPrefs', () => ({
  getStreamEditStrategy: vi.fn(() => 'progressive'),
}));

import { editAppStream } from '@/features/ai/editStreamClient';
import { generatePreviewHtml } from '@/features/builder/preview';
import { getStreamEditStrategy } from '@/features/builder/streamPrefs';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeStore(initialFiles: GeneratedFile[]) {
  const state: Partial<ExtendedBuilderState> = {
    model: 'google/gemini-3-flash-preview',
    projectId: 'p1',
    projectName: 'Test',
    files: initialFiles,
    messages: [{ id: 'a1', role: 'assistant', content: '' } as any],
    streamingBlocks: {},
    streamingFiles: [],
    streaming: true,
    streamBuffer: '',
  };

  return {
    getState: () => state as ExtendedBuilderState,
    setState: (
      partial:
        | Partial<ExtendedBuilderState>
        | ((s: ExtendedBuilderState) => Partial<ExtendedBuilderState>),
    ) => {
      const patch = typeof partial === 'function'
        ? partial(state as ExtendedBuilderState)
        : partial;
      Object.assign(state, patch);
    },
    _state: state,
  };
}

const baselineFiles: GeneratedFile[] = [
  {
    path: 'src/App.tsx',
    language: 'tsx',
    content: 'export default function App(){return <h1>Hello</h1>}',
  },
];

const fakeDoneFiles: GeneratedFile[] = [
  {
    path: 'src/App.tsx',
    language: 'tsx',
    content: 'export default function App(){return <h1>World</h1>}',
  },
];

function mockStreamEmit(events: { type: 'block' | 'token'; payload?: any }[]) {
  (editAppStream as any).mockImplementation(async (_input: any, cb: any) => {
    for (const ev of events) {
      if (ev.type === 'token') cb.onToken?.('chunk');
      if (ev.type === 'block') cb.onBlock?.(ev.payload);
    }
    const done = {
      full: 'full text',
      summary: 'updated greeting',
      applied: events.filter((e) => e.type === 'block').length,
      failed: [],
      bytes_saved: 1024,
      changed_paths: ['src/App.tsx'],
      files: fakeDoneFiles,
      credits_used: 3,
      credits_remaining: 97,
      tier: 'medium',
    };
    cb.onDone?.(done);
    return done;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('runStreamEdit — strategy A (progressive)', () => {
  beforeEach(() => {
    (getStreamEditStrategy as any).mockReturnValue('progressive');
  });

  it('aplica cada bloque a files y regenera preview en vivo', async () => {
    mockStreamEmit([
      {
        type: 'block',
        payload: {
          path: 'src/App.tsx',
          action: 'modify',
          search: '<h1>Hello</h1>',
          replace: '<h1>Hola</h1>',
          index: 0,
        },
      },
      {
        type: 'block',
        payload: {
          path: 'src/About.tsx',
          action: 'create',
          search: '',
          replace: 'export default () => <p>About</p>',
          index: 0,
        },
      },
    ]);

    const store = makeStore(baselineFiles);
    const res = await runStreamEdit({
      store: store as any,
      prompt: 'translate',
      assistantMsgId: 'a1',
    });

    expect(res.ok).toBe(true);
    // Anti-OOM: las regeneraciones por bloque están debounced (800ms) y se
    // cancelan cuando llega `done`. Solo el reconcile final ejecuta el HTML.
    expect(generatePreviewHtml).toHaveBeenCalledTimes(1);

    // Estado final viene del `done` (autoritativo del server)
    expect(store._state.files).toEqual(fakeDoneFiles);
    expect(store._state.streamingBlocks).toEqual({});
    expect(store._state.creditsUsed).toBe(3);
    expect(store._state.creditsRemaining).toBe(97);
  });

  it('cuenta blocksFailed cuando el SEARCH no matchea', async () => {
    mockStreamEmit([
      {
        type: 'block',
        payload: {
          path: 'src/App.tsx',
          action: 'modify',
          search: '<h1>NO_EXISTE</h1>',
          replace: '<h1>X</h1>',
          index: 0,
        },
      },
    ]);

    const store = makeStore(baselineFiles);
    await runStreamEdit({
      store: store as any,
      prompt: 'fail',
      assistantMsgId: 'a1',
    });

    // 1 final (done) — el block fallido no regenera preview
    expect(generatePreviewHtml).toHaveBeenCalledTimes(1);
  });

  it('elimina archivos en blocks action=delete', async () => {
    const files: GeneratedFile[] = [
      ...baselineFiles,
      { path: 'src/Old.tsx', language: 'tsx', content: 'old' },
    ];
    mockStreamEmit([
      {
        type: 'block',
        payload: { path: 'src/Old.tsx', action: 'delete', search: '', replace: '', index: 0 },
      },
    ]);

    const store = makeStore(files);
    await runStreamEdit({
      store: store as any,
      prompt: 'del',
      assistantMsgId: 'a1',
    });

    // Tras borrar quedaba solo App.tsx; luego done sobreescribe con fakeDoneFiles
    expect(store._state.files).toEqual(fakeDoneFiles);
    // Debounced: solo el done autoritativo regenera preview.
    expect(generatePreviewHtml).toHaveBeenCalledTimes(1);
  });
});

describe('runStreamEdit — strategy B (tokens-only)', () => {
  beforeEach(() => {
    (getStreamEditStrategy as any).mockReturnValue('tokens-only');
  });

  it('NO muta files ni regenera preview por block; solo trackea streamingBlocks', async () => {
    mockStreamEmit([
      {
        type: 'block',
        payload: {
          path: 'src/App.tsx',
          action: 'modify',
          search: '<h1>Hello</h1>',
          replace: '<h1>Hola</h1>',
          index: 0,
        },
      },
      {
        type: 'block',
        payload: {
          path: 'src/App.tsx',
          action: 'modify',
          search: 'foo',
          replace: 'bar',
          index: 1,
        },
      },
    ]);

    const store = makeStore(baselineFiles);
    // Snapshot referencia para asegurar que no mutamos files antes del done
    let filesDuringBlocks: GeneratedFile[] | null = null;
    (editAppStream as any).mockImplementationOnce(async (_input: any, cb: any) => {
      cb.onBlock({
        path: 'src/App.tsx',
        action: 'modify',
        search: '<h1>Hello</h1>',
        replace: '<h1>Hola</h1>',
        index: 0,
      });
      filesDuringBlocks = store._state.files as GeneratedFile[];
      const done = {
        full: '',
        summary: 'ok',
        applied: 1,
        failed: [],
        bytes_saved: 0,
        changed_paths: ['src/App.tsx'],
        files: fakeDoneFiles,
        credits_used: 3,
        credits_remaining: 97,
        tier: 'medium',
      };
      cb.onDone?.(done);
      return done;
    });

    await runStreamEdit({
      store: store as any,
      prompt: 'translate',
      assistantMsgId: 'a1',
    });

    // Mientras llegaban blocks, files seguía siendo el baseline
    expect(filesDuringBlocks).toEqual(baselineFiles);
    // generatePreviewHtml SOLO se llamó al final (done), nunca por bloque
    expect(generatePreviewHtml).toHaveBeenCalledTimes(1);
    // Pero sí se trackeó el bloque para el side panel
    expect(store._state.streamingBlocks).toEqual({});
    // Estado final = done.files
    expect(store._state.files).toEqual(fakeDoneFiles);
  });
});

describe('runStreamEdit — error handling', () => {
  it('hace rollback al baseline si editAppStream lanza', async () => {
    (editAppStream as any).mockRejectedValue(new Error('network down'));
    (getStreamEditStrategy as any).mockReturnValue('progressive');

    const store = makeStore(baselineFiles);
    const res = await runStreamEdit({
      store: store as any,
      prompt: 'x',
      assistantMsgId: 'a1',
    });

    expect(res.ok).toBe(false);
    expect(store._state.files).toEqual(baselineFiles);
    expect(store._state.streaming).toBe(false);
    expect(store._state.streamingBlocks).toEqual({});
  });

  it('devuelve ok:false si el server no emite evento done', async () => {
    (getStreamEditStrategy as any).mockReturnValue('progressive');
    (editAppStream as any).mockResolvedValue(null);

    const store = makeStore(baselineFiles);
    const res = await runStreamEdit({
      store: store as any,
      prompt: 'x',
      assistantMsgId: 'a1',
    });

    expect(res.ok).toBe(false);
    expect(store._state.streaming).toBe(false);
  });
});
