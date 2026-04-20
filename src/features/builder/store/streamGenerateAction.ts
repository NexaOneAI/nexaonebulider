/**
 * Streaming generation action — used for the FIRST app generation.
 * Streams tokens, surfaces filenames as they appear, then re-fetches the
 * persisted version from the server (the edge function is the source of
 * truth for credits + version_number).
 */
import { aiService } from '@/features/ai/aiService';
import { generatePreviewHtml } from '@/features/builder/preview';
import { useAuthStore } from '@/features/auth/authStore';
import { versionsService } from '@/features/projects/versionsService';
import { githubService } from '@/features/github/githubService';
import { useGithubStore } from '@/features/github/githubStore';
import type { ExtendedBuilderState } from '@/features/builder/builderTypes';
import type { Tier } from '@/features/ai/providers/types';

interface StoreLike {
  getState: () => ExtendedBuilderState;
  setState: (
    partial:
      | Partial<ExtendedBuilderState>
      | ((s: ExtendedBuilderState) => Partial<ExtendedBuilderState>),
  ) => void;
}

interface RunStreamGenerateArgs {
  store: StoreLike;
  prompt: string;
  assistantMsgId: string;
  userTier?: Tier;
}

export async function runStreamGenerate({
  store,
  prompt,
  assistantMsgId,
  userTier,
}: RunStreamGenerateArgs): Promise<{ ok: boolean }> {
  const { model, projectId } = store.getState();

  const updateAssistant = (text: string) => {
    store.setState((s) => ({
      messages: s.messages.map((m) =>
        m.id === assistantMsgId ? { ...m, content: text } : m,
      ),
    }));
  };

  const result = await aiService.generateAppStream(prompt, model, {
    projectId,
    userTier,
    onToken: (delta) => {
      store.setState((s) => ({ streamBuffer: s.streamBuffer + delta }));
      updateAssistant('⚡ Generando código...');
    },
    onFile: (f) => {
      store.setState((s) => ({
        streamingFiles: s.streamingFiles.includes(f.path)
          ? s.streamingFiles
          : [...s.streamingFiles, f.path],
      }));
    },
    onError: (msg) => updateAssistant(`❌ ${msg}`),
  });

  if (!result.ok) {
    store.setState({ streaming: false, streamBuffer: '', streamingFiles: [] });
    updateAssistant('⚠️ Streaming falló, reintentando sin streaming...');
    return { ok: false };
  }

  try {
    const list = projectId ? await versionsService.list(projectId) : [];
    const latest = list[0];
    if (latest && latest.generated_files.length > 0) {
      const newFiles = latest.generated_files;
      const previewCode = generatePreviewHtml(
        newFiles,
        store.getState().projectName,
        model,
      );
      updateAssistant(`✅ App generada (stream) con ${newFiles.length} archivos.`);
      store.setState({
        files: newFiles,
        previewCode,
        selectedFile: null,
        showCode: false,
        loading: false,
        streaming: false,
        streamBuffer: '',
        streamingFiles: [],
        mode: 'edit',
        previewError: null,
      });
      useAuthStore.getState().refreshProfile().catch(() => {});
      if (projectId) {
        autoPushToGithub(projectId, newFiles, latest.id, `chore: generate app v${latest.version_number}`).catch(
          (e) => console.warn('[github] auto-push failed', e),
        );
      }
      return { ok: true };
    }
  } catch (e) {
    console.error('[stream] post-fetch failed', e);
  }

  store.setState({ streaming: false, streamBuffer: '', streamingFiles: [] });
  return { ok: false };
}

async function autoPushToGithub(
  projectId: string,
  files: { path: string; content: string }[],
  versionId: string,
  message: string,
) {
  const { refresh, setPushing } = useGithubStore.getState();
  const status = useGithubStore.getState().byProject[projectId]
    ?? (await refresh(projectId).catch(() => null));
  if (!status?.repo || !status.repo.auto_push) return;
  setPushing(projectId, true);
  try {
    await githubService.push({ projectId, files, message, versionId });
    await refresh(projectId).catch(() => {});
  } finally {
    setPushing(projectId, false);
  }
}
