import { create } from 'zustand';
import { aiService } from '../ai/aiService';
import { generatePreviewHtml } from './preview';
import type { BuilderState } from './builderTypes';
import type { GeneratedFile } from '../projects/projectTypes';
import type { AIMessage } from '../ai/aiTypes';
import { generateId } from '@/lib/utils';

interface BuilderActions {
  setProjectName: (name: string) => void;
  setModel: (model: string) => void;
  setViewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  setSelectedFile: (file: GeneratedFile | null) => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
  sendPrompt: (prompt: string) => Promise<void>;
  reset: (projectId: string) => void;
}

const initialState: Omit<BuilderState, 'projectId'> = {
  projectName: 'Mi proyecto',
  files: [],
  messages: [],
  selectedFile: null,
  previewCode: '',
  model: 'openai',
  viewMode: 'desktop',
  sidebarOpen: true,
  chatOpen: true,
  loading: false,
  mode: 'create',
};

export const useBuilderStore = create<BuilderState & BuilderActions>((set, get) => ({
  ...initialState,
  projectId: '',

  setProjectName: (name) => set({ projectName: name }),
  setModel: (model) => set({ model }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedFile: (file) => set({ selectedFile: file }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

  reset: (projectId) => set({ ...initialState, projectId }),

  sendPrompt: async (prompt) => {
    const { model, projectId, files, messages, mode } = get();

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
      const response = mode === 'create' && files.length === 0
        ? await aiService.generateApp(prompt, model)
        : await aiService.editApp(prompt, model, JSON.stringify(files));

      const newFiles = response.files;
      const previewCode = generatePreviewHtml(newFiles, response.projectName || get().projectName, model);

      const aiMsg: AIMessage = {
        id: generateId(),
        project_id: projectId,
        role: 'assistant',
        content: `✅ ${mode === 'create' ? 'App generada' : 'App actualizada'} con ${newFiles.length} archivos. Puedes seguir editando por chat.`,
        model,
        created_at: new Date().toISOString(),
      };

      set({
        files: newFiles,
        previewCode,
        selectedFile: newFiles[0] || null,
        messages: [...get().messages, aiMsg],
        loading: false,
        mode: 'edit',
        projectName: response.projectName || get().projectName,
      });
    } catch (error) {
      const errorMsg: AIMessage = {
        id: generateId(),
        project_id: projectId,
        role: 'assistant',
        content: `❌ Error al generar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        model,
        created_at: new Date().toISOString(),
      };
      set({ messages: [...get().messages, errorMsg], loading: false });
    }
  },
}));
