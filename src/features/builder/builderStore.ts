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
  reset: (projectId: string) => void;
}

interface ExtendedBuilderState extends BuilderState {
  showCode: boolean;
  creditsUsed: number;
  creditsRemaining: number;
  tier: Tier | null; // optional user override
  lastTier: string | null; // last tier actually charged
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

    set({ messages: [...messages, userMsg], loading: true });

    try {
      const isFirstGeneration = mode === 'create' && files.length === 0;
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

      const aiMsg: AIMessage = {
        id: generateId(),
        project_id: projectId,
        role: 'assistant',
        content: isFirstGeneration
          ? `✅ App generada con ${newFiles.length} archivos (${meta?.credits_used || 0} créditos · ${meta?.tier || '?'}).`
          : `✏️ ${summary || 'App actualizada'} — ${changedCount || 0} archivos modificados (${meta?.credits_used || 0} créditos · ${meta?.tier || '?'}).`,
        model,
        created_at: new Date().toISOString(),
      };

      set({
        files: newFiles,
        previewCode,
        selectedFile: null,
        showCode: false,
        messages: [...get().messages, aiMsg],
        loading: false,
        mode: 'edit',
        projectName: response.projectName || get().projectName,
        creditsUsed: meta?.credits_used || 0,
        creditsRemaining: meta?.credits_remaining ?? -1,
        lastTier: meta?.tier || null,
        tier: null, // reset override after use
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const aiMsg: AIMessage = {
        id: generateId(),
        project_id: projectId,
        role: 'assistant',
        content: `❌ ${errorMessage}`,
        model,
        created_at: new Date().toISOString(),
      };
      set({ messages: [...get().messages, aiMsg], loading: false });
    }
  },
}));
