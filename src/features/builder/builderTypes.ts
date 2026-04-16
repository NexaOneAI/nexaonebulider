import type { GeneratedFile } from '../projects/projectTypes';
import type { AIMessage } from '../ai/aiTypes';

export interface BuilderState {
  projectId: string;
  projectName: string;
  files: GeneratedFile[];
  messages: AIMessage[];
  selectedFile: GeneratedFile | null;
  previewCode: string;
  model: string;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  sidebarOpen: boolean;
  chatOpen: boolean;
  loading: boolean;
  mode: 'create' | 'edit';
}
