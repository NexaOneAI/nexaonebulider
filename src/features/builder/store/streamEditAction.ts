/**
 * Streaming edit action — applies SEARCH/REPLACE blocks progressively in
 * the client as they arrive from /chat-edit-stream. The server is still
 * authoritative (it persists the version and recomputes the final file
 * map), but the UI updates optimistically per-block so the user sees
 * changes appearing in real time.
 */
import { editAppStream } from '@/features/ai/editStreamClient';
import { applyBlock } from '@/features/builder/searchReplaceClient';
import { generatePreviewHtml } from '@/features/builder/preview';
import { useAuthStore } from '@/features/auth/authStore';
import { getStreamEditStrategy } from '@/features/builder/streamPrefs';
import type { ExtendedBuilderState } from '@/features/builder/builderTypes';
import type { GeneratedFile } from '@/features/projects/projectTypes';
import type { Tier } from '@/features/ai/providers/types';

interface StoreLike {
  getState: () => ExtendedBuilderState;
  setState: (
    partial:
      | Partial<ExtendedBuilderState>
      | ((s: ExtendedBuilderState) => Partial<ExtendedBuilderState>),
  ) => void;
}

interface RunStreamEditArgs {
  store: StoreLike;
  prompt: string;
  assistantMsgId: string;
  userTier?: Tier;
}

function inferLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const m: Record<string, string> = {
    tsx: 'tsx', ts: 'typescript', jsx: 'jsx', js: 'javascript',
    css: 'css', html: 'html', json: 'json', md: 'markdown',
  };
  return m[ext] || 'text';
}

export async function runStreamEdit({
  store,
  prompt,
  assistantMsgId,
  userTier,
}: RunStreamEditArgs): Promise<{ ok: boolean }> {
  const { model, projectId, files } = store.getState();
  const baselineFiles: GeneratedFile[] = files.map((f) => ({ ...f }));
  const strategy = getStreamEditStrategy();
  const progressive = strategy === 'progressive';

  const updateAssistant = (text: string) => {
    store.setState((s) => ({
      messages: s.messages.map((m) =>
        m.id === assistantMsgId ? { ...m, content: text } : m,
      ),
    }));
  };

  // Mutable working copy keyed by path (so blocks apply progressively).
  const working = new Map<string, GeneratedFile>();
  for (const f of baselineFiles) working.set(f.path, { ...f });

  let blocksApplied = 0;
  let blocksFailed = 0;

  try {
    const done = await editAppStream(
      {
        prompt,
        model,
        projectId,
        userTier,
        currentFiles: baselineFiles,
      },
      {
        onToken: () => {
          if (progressive) {
            updateAssistant(
              `✏️ Editando… ${blocksApplied} bloques aplicados${blocksFailed ? ` · ⚠️ ${blocksFailed} fallaron` : ''}`,
            );
          } else {
            updateAssistant(`✏️ Editando… recibiendo cambios del modelo`);
          }
        },
        onBlock: (block) => {
          // Tokens-only mode (B): track block paths for the side panel but
          // don't mutate files/preview until the server emits `done`.
          if (!progressive) {
            store.setState((s) => ({
              streamingBlocks: {
                ...s.streamingBlocks,
                [block.path]: (s.streamingBlocks[block.path] || 0) + 1,
              },
            }));
            return;
          }

          if (block.action === 'delete') {
            working.delete(block.path);
            blocksApplied += 1;
          } else if (block.action === 'create' || (block.action === 'modify' && !working.has(block.path))) {
            working.set(block.path, {
              path: block.path,
              content: block.replace,
              language: block.language || inferLanguage(block.path),
            });
            blocksApplied += 1;
          } else {
            const target = working.get(block.path);
            if (!target) {
              blocksFailed += 1;
              return;
            }
            const next = applyBlock(target.content, { search: block.search, replace: block.replace });
            if (next == null) {
              blocksFailed += 1;
              return;
            }
            working.set(block.path, { ...target, content: next });
            blocksApplied += 1;
          }

          // Push optimistic preview update every block
          const arr = Array.from(working.values());
          const previewCode = generatePreviewHtml(arr, store.getState().projectName, model);
          store.setState((s) => ({
            files: arr,
            previewCode,
            previewError: null,
            streamingBlocks: {
              ...s.streamingBlocks,
              [block.path]: (s.streamingBlocks[block.path] || 0) + 1,
            },
          }));
        },
        onError: (msg) => updateAssistant(`❌ ${msg}`),
      },
    );

    if (!done) {
      // Fallback: server didn't emit final done event
      store.setState({ streaming: false, streamBuffer: '', streamingFiles: [], streamingBlocks: {} });
      updateAssistant('⚠️ Edit stream falló, reintentando sin streaming...');
      return { ok: false };
    }

    // Authoritative reconciliation with server's final file map
    const previewCode = generatePreviewHtml(done.files, store.getState().projectName, model);
    const summary = done.summary || 'App actualizada';
    const kbSaved = done.bytes_saved > 0 ? ` · 💾 ~${(done.bytes_saved / 1024).toFixed(1)} KB ahorrados` : '';
    const failTxt = done.failed.length ? ` · ⚠️ ${done.failed.length} bloques fallaron` : '';

    store.setState((s) => ({
      files: done.files,
      previewCode,
      selectedFile: null,
      showCode: false,
      loading: false,
      streaming: false,
      streamBuffer: '',
      streamingFiles: [],
      streamingBlocks: {},
      mode: 'edit',
      creditsUsed: done.credits_used,
      creditsRemaining: done.credits_remaining,
      lastTier: done.tier,
      tier: null,
      previewError: null,
      messages: s.messages.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              content: `✏️ ${summary} — ${done.applied} bloques en ${done.changed_paths.length} archivos · ${done.credits_used} créditos · ${done.tier}${kbSaved}${failTxt}`,
            }
          : m,
      ),
    }));

    useAuthStore.getState().refreshProfile().catch(() => {});
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Edit stream error';
    // Roll back to baseline so user isn't left with a half-applied state.
    const previewCode = generatePreviewHtml(baselineFiles, store.getState().projectName, model);
    store.setState({
      files: baselineFiles,
      previewCode,
      streaming: false,
      streamBuffer: '',
      streamingFiles: [],
      streamingBlocks: {},
    });
    updateAssistant(`⚠️ ${msg}. Reintentando sin streaming…`);
    return { ok: false };
  }
}
