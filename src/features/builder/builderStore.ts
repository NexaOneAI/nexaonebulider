import { create } from 'zustand';
import { aiService } from '../ai/aiService';
import { generatePreviewHtml } from './preview';
import type {
  ExtendedBuilderState,
  BuilderActions,
  PreviewError,
} from './builderTypes';
import type { GeneratedFile } from '../projects/projectTypes';
import type { AIMessage } from '../ai/aiTypes';
import { generateId } from '@/lib/utils';
import { DEFAULT_MODEL } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/features/auth/authStore';
import { runStreamGenerate } from './store/streamGenerateAction';
import { runStreamEdit } from './store/streamEditAction';
import { usePreviewErrorsStore, buildFixPrompt } from './previewErrorsStore';
import { getChatCutoff } from './chatCutoff';
import { manualSaveService } from '@/features/projects/manualSaveService';
import { autoPushToGithub } from '@/features/github/autoPush';
import { toast } from 'sonner';

const initialState: Omit<ExtendedBuilderState, 'projectId'> = {
  projectName: 'Mi proyecto',
  files: [],
  messages: [],
  selectedFile: null,
  previewCode: '',
  model: DEFAULT_MODEL,
  viewMode: 'desktop',
  sidebarOpen: true,
  chatOpen: true,
  loading: false,
  mode: 'create',
  showCode: false,
  creditsUsed: 0,
  creditsRemaining: -1,
  tier: null,
  lastTier: null,
  previewError: null,
  streaming: false,
  streamBuffer: '',
  streamingFiles: [],
  streamingBlocks: {},
  highlightLine: null,
  dirty: false,
  saveStatus: 'idle',
  lastSavedAt: null,
};

export const useBuilderStore = create<ExtendedBuilderState & BuilderActions>((set, get) => {
  const storeApi = {
    getState: get,
    setState: set as ReturnType<typeof get> extends ExtendedBuilderState
      ? (
          partial:
            | Partial<ExtendedBuilderState>
            | ((s: ExtendedBuilderState) => Partial<ExtendedBuilderState>),
        ) => void
      : never,
  };

  return {
    ...initialState,
    projectId: '',

    setProjectName: (name) => set({ projectName: name }),
    setModel: (model) => set({ model }),
    setTier: (tier) => set({ tier }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setSelectedFile: (file) => set({ selectedFile: file, highlightLine: null }),
    setShowCode: (show) => set({ showCode: show }),
    setHighlightLine: (line) => set({ highlightLine: line }),
    updateFileContent: (path: string, content: string) =>
      set((s) => {
        const files = s.files.map((f) => (f.path === path ? { ...f, content } : f));
        const selectedFile =
          s.selectedFile && s.selectedFile.path === path
            ? { ...s.selectedFile, content }
            : s.selectedFile;
        return { files, selectedFile, dirty: true, saveStatus: 'idle' };
      }),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

    reset: (projectId) => set({ ...initialState, projectId }),

    setPreviewError: (err: PreviewError | null) => set({ previewError: err }),

    fixWithAI: async (errorId?: string) => {
      const errorsStore = usePreviewErrorsStore.getState();
      const target = errorId
        ? errorsStore.errors.find((e) => e.id === errorId)
        : errorsStore.latest();

      if (target) {
        const prompt = buildFixPrompt(target, get().files);
        // Limpia este error específico del store y el legacy single-error
        errorsStore.remove(target.id);
        set({ previewError: null });
        await get().sendPrompt(prompt, 'simple_edit');
        return;
      }

      // Fallback: legacy single previewError
      const err = get().previewError;
      if (!err) return;
      const prompt = `El preview lanza el siguiente error en runtime, arréglalo:\n\n${err.message}\n\n${err.stack}`.slice(0, 2000);
      set({ previewError: null });
      await get().sendPrompt(prompt, 'simple_edit');
    },

    loadVersion: async (versionId: string) => {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (error || !data) return;

      const files = (data.generated_files as unknown as GeneratedFile[]) || [];
      const previewCode = generatePreviewHtml(files, get().projectName, data.model_used);

      set({
        files,
        previewCode,
        selectedFile: files[0] || null,
        mode: 'edit',
        dirty: false,
        saveStatus: 'saved',
        lastSavedAt: data.created_at ?? new Date().toISOString(),
      });
    },

    saveVersion: async (trigger, note) => {
      const { projectId, files } = get();
      if (!projectId) {
        toast.error('No hay proyecto activo');
        return;
      }
      if (files.length === 0) {
        toast.info('Genera o edita una app primero');
        return;
      }
      // Skip auto-saves when there are no pending changes
      if (trigger === 'auto' && !get().dirty) return;

      set({ saveStatus: 'saving' });
      const tid = trigger === 'manual' ? toast.loading('Guardando versión…') : null;
      try {
        const { versionId, versionNumber } = await manualSaveService.save({
          projectId,
          files,
          trigger,
          note,
        });
        set({
          dirty: false,
          saveStatus: 'saved',
          lastSavedAt: new Date().toISOString(),
        });
        if (tid) toast.success(`Versión v${versionNumber} guardada`, { id: tid });

        // Auto-push to GitHub only on manual saves (per user preference).
        if (trigger === 'manual') {
          autoPushToGithub(
            projectId,
            files,
            versionId,
            `chore: manual checkpoint v${versionNumber}${note ? ` — ${note}` : ''}`,
          ).catch((e) => console.warn('[github] auto-push (manual save) failed', e));
        }
      } catch (err) {
        set({ saveStatus: 'error' });
        const msg = err instanceof Error ? err.message : 'Error al guardar';
        if (tid) toast.error(msg, { id: tid });
        else toast.error(`Auto-save falló: ${msg}`);
      }
    },

    sendPrompt: async (prompt, tierOverride) => {
      const { model, projectId, files, messages, mode, tier } = get();
      const userTier = tierOverride || tier || undefined;

      const userMsg: AIMessage = {
        id: generateId(),
        project_id: projectId,
        role: 'user',
        content: prompt,
        model,
        created_at: new Date().toISOString(),
      };

      const assistantMsgId = generateId();
      const assistantSeed: AIMessage = {
        id: assistantMsgId,
        project_id: projectId,
        role: 'assistant',
        content: '',
        model,
        created_at: new Date().toISOString(),
      };

      set({
        messages: [...messages, userMsg, assistantSeed],
        loading: true,
        streaming: true,
        streamBuffer: '',
        streamingFiles: [],
        streamingBlocks: {},
      });

      const isFirstGeneration = mode === 'create' && files.length === 0;

      // ---------- Streaming paths ----------
      const streamResult = isFirstGeneration
        ? await runStreamGenerate({ store: storeApi, prompt, assistantMsgId, userTier })
        : await runStreamEdit({ store: storeApi, prompt, assistantMsgId, userTier });

      if (streamResult.ok) return;

      // ---------- Non-streaming fallback ----------
      try {
        const response = isFirstGeneration
          ? await aiService.generateApp(prompt, model, { projectId, userTier })
          : await aiService.editApp(prompt, model, files, {
              projectId,
              userTier,
              historyAfter: getChatCutoff(projectId),
            });

        const newFiles = response.files;
        const previewCode = generatePreviewHtml(
          newFiles,
          response.projectName || get().projectName,
          model,
        );

        const meta = (response as any)?._meta;
        const summary = (response as any)?.summary;
        const changedCount =
          (response as any)?.changed_paths?.length ??
          (response as any)?.changed_files?.length ??
          0;

        const editFooter = () => {
          const parts: string[] = [];
          if (meta?.blocks_applied != null) {
            parts.push(`${meta.blocks_applied} bloques en ${changedCount} archivos`);
          } else {
            parts.push(`${changedCount} archivos modificados`);
          }
          parts.push(`${meta?.credits_used || 0} créditos · ${meta?.tier || '?'}`);
          if (typeof meta?.bytes_saved === 'number' && meta.bytes_saved > 0) {
            const kb = (meta.bytes_saved / 1024).toFixed(1);
            parts.push(`💾 ~${kb} KB ahorrados (diffs)`);
          }
          if (Array.isArray(meta?.blocks_failed) && meta.blocks_failed.length > 0) {
            parts.push(`⚠️ ${meta.blocks_failed.length} bloques fallaron`);
          }
          return parts.join(' · ');
        };

        set((s) => ({
          files: newFiles,
          previewCode,
          selectedFile: null,
          showCode: false,
          messages: s.messages.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: isFirstGeneration
                    ? `✅ App generada con ${newFiles.length} archivos (${meta?.credits_used || 0} créditos · ${meta?.tier || '?'}).`
                    : `✏️ ${summary || 'App actualizada'} — ${editFooter()}.`,
                }
              : m,
          ),
          loading: false,
          streaming: false,
          mode: 'edit',
          projectName: response.projectName || s.projectName,
          creditsUsed: meta?.credits_used || 0,
          creditsRemaining: meta?.credits_remaining ?? -1,
          lastTier: meta?.tier || null,
          tier: null,
          previewError: null,
        }));

        useAuthStore.getState().refreshProfile().catch(() => {});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantMsgId ? { ...m, content: `❌ ${errorMessage}` } : m,
          ),
          loading: false,
          streaming: false,
          streamBuffer: '',
          streamingFiles: [],
          streamingBlocks: {},
        }));
      }
    },
  };
});
