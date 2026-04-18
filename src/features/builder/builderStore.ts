import { create } from 'zustand';
import { aiService } from '../ai/aiService';
import { generatePreviewHtml } from './preview';
import type { BuilderState } from './builderTypes';
import type { GeneratedFile } from '../projects/projectTypes';
import type { AIMessage } from '../ai/aiTypes';
import type { Tier } from '../ai/providers/types';
import { generateId } from '@/lib/utils';
import { DEFAULT_MODEL } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/features/auth/authStore';
import { versionsService } from '@/features/projects/versionsService';

interface BuilderActions {
  setProjectName: (name: string) => void;
  setModel: (model: string) => void;
  setTier: (tier: Tier | null) => void;
  setViewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  setSelectedFile: (file: GeneratedFile | null) => void;
  setShowCode: (show: boolean) => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
  sendPrompt: (prompt: string, tierOverride?: Tier) => Promise<void>;
  loadVersion: (versionId: string) => Promise<void>;
  setPreviewError: (err: PreviewError | null) => void;
  fixWithAI: () => Promise<void>;
  reset: (projectId: string) => void;
}

interface PreviewError {
  message: string;
  stack: string;
  at: number;
}

interface ExtendedBuilderState extends BuilderState {
  showCode: boolean;
  creditsUsed: number;
  creditsRemaining: number;
  tier: Tier | null;
  lastTier: string | null;
  previewError: PreviewError | null;
  /** Streaming state — set while the AI is producing tokens */
  streaming: boolean;
  /** Live token buffer shown in the chat while streaming */
  streamBuffer: string;
  /** Files detected in the streamed JSON (preview placeholder before commit) */
  streamingFiles: string[];
}

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
};

export const useBuilderStore = create<ExtendedBuilderState & BuilderActions>((set, get) => ({
  ...initialState,
  projectId: '',

  setProjectName: (name) => set({ projectName: name }),
  setModel: (model) => set({ model }),
  setTier: (tier) => set({ tier }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedFile: (file) => set({ selectedFile: file }),
  setShowCode: (show) => set({ showCode: show }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

  reset: (projectId) => set({ ...initialState, projectId }),

  setPreviewError: (err) => set({ previewError: err }),

  fixWithAI: async () => {
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
    });
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

    // Pre-create the assistant message — we'll fill it as tokens stream in.
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
    });

    const isFirstGeneration = mode === 'create' && files.length === 0;

    // ---------- Streaming path (only for first generation today) ----------
    if (isFirstGeneration) {
      const updateAssistant = (text: string) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantMsgId ? { ...m, content: text } : m,
          ),
        }));
      };

      const result = await aiService.generateAppStream(prompt, model, {
        projectId,
        userTier,
        onToken: (delta) => {
          set((s) => {
            const buf = s.streamBuffer + delta;
            return { streamBuffer: buf };
          });
          // Show a friendly "Generando..." prefix instead of raw JSON in the bubble
          updateAssistant('⚡ Generando código...');
        },
        onFile: (f) => {
          set((s) => ({
            streamingFiles: s.streamingFiles.includes(f.path)
              ? s.streamingFiles
              : [...s.streamingFiles, f.path],
          }));
        },
        onError: (msg) => {
          updateAssistant(`❌ ${msg}`);
        },
      });

      if (result.ok) {
        // Server already persisted the version. Pull the latest one to render.
        try {
          const list = projectId ? await versionsService.list(projectId) : [];
          const latest = list[0];
          if (latest && latest.generated_files.length > 0) {
            const newFiles = latest.generated_files;
            const previewCode = generatePreviewHtml(newFiles, get().projectName, model);
            updateAssistant(
              `✅ App generada (stream) con ${newFiles.length} archivos.`,
            );
            set({
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
            return;
          }
        } catch (e) {
          console.error('[stream] post-fetch failed', e);
        }
      }

      // Stream failed or version didn't appear → fallback to non-streaming
      set({ streaming: false, streamBuffer: '', streamingFiles: [] });
      updateAssistant('⚠️ Streaming falló, reintentando sin streaming...');
    }

    // ---------- Non-streaming path (edits + fallback) ----------
    try {
      const response = isFirstGeneration
        ? await aiService.generateApp(prompt, model, { projectId, userTier })
        : await aiService.editApp(prompt, model, files, { projectId, userTier });

      const newFiles = response.files;
      const previewCode = generatePreviewHtml(
        newFiles,
        response.projectName || get().projectName,
        model,
      );

      const meta = (response as any)?._meta;
      const summary = (response as any)?.summary;
      const changedCount = (response as any)?.changed_files?.length;

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
                  : `✏️ ${summary || 'App actualizada'} — ${changedCount || 0} archivos modificados (${meta?.credits_used || 0} créditos · ${meta?.tier || '?'}).`,
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
      }));
    }
  },
}));
