import type { AiModelOption, AiModelStatus, AiProvider } from './aiTypes';

/**
 * Catalog of AI models available in the builder.
 *
 * Status semantics:
 * - 'ready'       → live today (Lovable Gateway: OpenAI + Gemini)
 * - 'preview'     → adapter wired, requires a backend secret to fully activate
 *                    (Claude → ANTHROPIC_API_KEY, Grok → XAI_API_KEY).
 *                    Selectable in UI; backend falls back to Lovable Gateway until secret exists.
 * - 'unavailable' → reserved for fully not-implemented models.
 */
export const AI_MODELS: AiModelOption[] = [
  // ===== Lovable Gateway (default) =====
  { id: 'lovable-default', label: 'Lovable Gateway (auto)', provider: 'lovable', status: 'ready' },

  // ===== OpenAI via Lovable Gateway =====
  { id: 'openai/gpt-5', label: 'OpenAI GPT-5', provider: 'openai', status: 'ready' },
  { id: 'openai/gpt-5-mini', label: 'OpenAI GPT-5 Mini', provider: 'openai', status: 'ready' },

  // ===== Google Gemini via Lovable Gateway =====
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini', status: 'ready' },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', provider: 'gemini', status: 'ready' },
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Lite', provider: 'gemini', status: 'ready' },

  // ===== Anthropic Claude — preparado, requiere ANTHROPIC_API_KEY =====
  { id: 'claude/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'claude', status: 'preview', requiresSecret: 'ANTHROPIC_API_KEY' },
  { id: 'claude/claude-3-opus', label: 'Claude 3 Opus', provider: 'claude', status: 'preview', requiresSecret: 'ANTHROPIC_API_KEY' },

  // ===== xAI Grok — preparado, requiere XAI_API_KEY =====
  { id: 'grok/grok-2', label: 'Grok 2', provider: 'grok', status: 'preview', requiresSecret: 'XAI_API_KEY' },
  { id: 'grok/grok-beta', label: 'Grok Beta', provider: 'grok', status: 'preview', requiresSecret: 'XAI_API_KEY' },
];

export function getAllModels(): AiModelOption[] {
  return AI_MODELS;
}

export function getReadyModels(): AiModelOption[] {
  return AI_MODELS.filter((m) => m.status === 'ready');
}

export function getModelsByStatus(status: AiModelStatus): AiModelOption[] {
  return AI_MODELS.filter((m) => m.status === status);
}

export function getModelById(modelId: string): AiModelOption | null {
  return AI_MODELS.find((m) => m.id === modelId) ?? null;
}

export function getModelsByProvider(provider: AiProvider): AiModelOption[] {
  return AI_MODELS.filter((m) => m.provider === provider);
}

/** Backwards-compat alias — returns models that are usable today. */
export function getEnabledModels(): AiModelOption[] {
  return getReadyModels();
}
