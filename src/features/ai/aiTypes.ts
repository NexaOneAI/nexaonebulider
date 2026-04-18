// AI feature types
export interface AIMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string;
  created_at: string;
}

export interface AIStructuredResponse {
  projectName: string;
  description: string;
  files: import('../projects/projectTypes').GeneratedFile[];
  dependencies: Record<string, string>;
  pages: string[];
  components: string[];
}

// ===== Strict client contract (used by aiClient.ts) =====
export type AiMode = 'create' | 'edit';

export type AiProvider = 'openai' | 'gemini' | 'claude' | 'grok' | 'lovable' | 'custom';

/**
 * Lifecycle status of a model in the UI:
 * - 'ready'        → fully wired, selectable, calls succeed today
 * - 'preview'      → adapter exists but requires a backend secret (e.g. ANTHROPIC_API_KEY).
 *                    Visible & selectable in UI as "Preparado", but requests will fall back
 *                    to the Lovable Gateway until the secret is configured.
 * - 'unavailable'  → not implemented; shown disabled with "Próximamente".
 */
export type AiModelStatus = 'ready' | 'preview' | 'unavailable';

export interface AiModelOption {
  id: string;
  label: string;
  provider: AiProvider;
  status: AiModelStatus;
  /** Backend secret name required to fully activate this model (used in tooltips). */
  requiresSecret?: string;
}

/**
 * Infer the AiProvider from a model id by prefix.
 * Mirrors the backend logic in supabase/functions/generate-app/index.ts.
 */
export function inferProviderFromModel(model: string | undefined): AiProvider {
  const m = (model ?? '').toLowerCase();
  if (m.startsWith('openai/')) return 'openai';
  if (m.startsWith('google/') || m.startsWith('gemini/')) return 'gemini';
  if (m.startsWith('claude/') || m.startsWith('anthropic/')) return 'claude';
  if (m.startsWith('grok/') || m.startsWith('xai/')) return 'grok';
  if (m.startsWith('custom/')) return 'custom';
  return 'lovable';
}

export type AiActionKey =
  | 'simple_prompt'
  | 'simple_task'
  | 'edit_prompt'
  | 'simple_edit'
  | 'medium_module'
  | 'complex_module'
  | 'full_app';

export interface GenerateAppInput {
  projectId: string;
  prompt: string;
  mode: AiMode;
  actionKey: AiActionKey;
  provider: AIProviderId;
  model: string;
}

export interface GenerateAppResult {
  ok: boolean;
  versionId?: string;
  versionNumber?: number;
  files?: Record<string, string>;
  previewCode?: string;
  dependencies?: string[];
  creditsCharged?: number;
  error?: string;
}

export type AIProviderId = 'openai' | 'google' | 'claude' | 'grok' | 'custom';

export interface AIProviderConfig {
  id: string;
  name: string;
  label: string;
  available: boolean;
  provider: AIProviderId;
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  // OpenAI (via Lovable Gateway)
  { id: 'openai/gpt-5', name: 'GPT-5', label: 'OpenAI GPT-5', available: true, provider: 'openai' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', label: 'OpenAI GPT-5 Mini', available: true, provider: 'openai' },
  // Google (via Lovable Gateway)
  { id: 'google/gemini-2.5-pro', name: 'Gemini Pro', label: 'Gemini 2.5 Pro', available: true, provider: 'google' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini Flash', label: 'Gemini 3 Flash', available: true, provider: 'google' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini Lite', label: 'Gemini 2.5 Lite', available: true, provider: 'google' },
  // Anthropic — placeholder (requires ANTHROPIC_API_KEY)
  { id: 'claude/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', label: 'Claude 3.5 Sonnet (próximamente)', available: false, provider: 'claude' },
  { id: 'claude/claude-3-5-haiku', name: 'Claude 3.5 Haiku', label: 'Claude 3.5 Haiku (próximamente)', available: false, provider: 'claude' },
  // xAI — placeholder (requires XAI_API_KEY)
  { id: 'grok/grok-2', name: 'Grok 2', label: 'Grok 2 (próximamente)', available: false, provider: 'grok' },
  { id: 'grok/grok-2-mini', name: 'Grok 2 Mini', label: 'Grok 2 Mini (próximamente)', available: false, provider: 'grok' },
];

// ===== V2 contract: looser request shape + flat output =====
export interface GenerateAppRequest {
  projectId: string;
  prompt: string;
  mode?: AiMode;
  actionKey?: AiActionKey;
  model?: string;
  provider?: AiProvider;
}

export interface BuilderOutput {
  projectName: string;
  description?: string;
  dependencies: string[];
  files: Record<string, string>;
  previewCode?: string;
}
