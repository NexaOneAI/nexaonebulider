import type { GeneratedFile } from '../projects/projectTypes';
import type { AIMessage } from '../ai/aiTypes';
import type { Tier } from '../ai/providers/types';

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

export interface PreviewError {
  message: string;
  stack: string;
  at: number;
}

export interface ExtendedBuilderState extends BuilderState {
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
  /** During edit-stream: blocks already applied client-side (path → count) */
  streamingBlocks: Record<string, number>;
}

export interface BuilderActions {
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
  fixWithAI: (errorId?: string) => Promise<void>;
  reset: (projectId: string) => void;
}
