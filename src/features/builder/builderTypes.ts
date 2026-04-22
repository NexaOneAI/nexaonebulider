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
  /** 1-indexed line to highlight & scroll to in the CodeEditor (search jump) */
  highlightLine: number | null;
  /** True when the in-memory files differ from the last persisted version */
  dirty: boolean;
  /** Save lifecycle for the header indicator */
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  /** ISO timestamp of the last successful manual/auto save */
  lastSavedAt: string | null;
}

export interface BuilderActions {
  setProjectName: (name: string) => void;
  setModel: (model: string) => void;
  setTier: (tier: Tier | null) => void;
  setViewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  setSelectedFile: (file: GeneratedFile | null) => void;
  setShowCode: (show: boolean) => void;
  setHighlightLine: (line: number | null) => void;
  /** Live edit a file's content (used by the editor → triggers WC HMR). */
  updateFileContent: (path: string, content: string) => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
  sendPrompt: (prompt: string, tierOverride?: Tier) => Promise<void>;
  loadVersion: (versionId: string) => Promise<void>;
  setPreviewError: (err: PreviewError | null) => void;
  fixWithAI: (errorId?: string) => Promise<void>;
  reset: (projectId: string) => void;
  /**
   * Load a project from the database: hydrates project metadata,
   * latest version files, and chat history. Use this when entering
   * an existing project from the dashboard so it doesn't open empty.
   */
  loadProject: (projectId: string) => Promise<void>;
  /** Persist current files as a new project_versions row (checkpoint). */
  saveVersion: (trigger: 'manual' | 'auto', note?: string) => Promise<void>;
}
