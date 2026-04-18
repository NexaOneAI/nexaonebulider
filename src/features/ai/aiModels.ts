import type { AiModelOption } from './aiTypes';

/**
 * Catalog of AI models available in the builder.
 *
 * IDs use the Lovable Gateway naming convention (`provider/model`) for
 * OpenAI + Gemini (which work today). Claude and Grok are listed as
 * `requiresKey: true` placeholders until their direct adapters are wired.
 */
export const AI_MODELS: AiModelOption[] = [
  // ===== Lovable Gateway (default, no key required) =====
  {
    id: 'lovable-default',
    label: 'Lovable Gateway (auto)',
    provider: 'lovable',
    enabled: true,
  },

  // ===== OpenAI via Lovable Gateway =====
  {
    id: 'openai/gpt-5',
    label: 'OpenAI GPT-5',
    provider: 'openai',
    enabled: true,
  },
  {
    id: 'openai/gpt-5-mini',
    label: 'OpenAI GPT-5 Mini',
    provider: 'openai',
    enabled: true,
  },

  // ===== Google Gemini via Lovable Gateway =====
  {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'gemini',
    enabled: true,
  },
  {
    id: 'google/gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    provider: 'gemini',
    enabled: true,
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Lite',
    provider: 'gemini',
    enabled: true,
  },

  // ===== Anthropic Claude (requires ANTHROPIC_API_KEY) =====
  {
    id: 'claude/claude-3-5-sonnet',
    label: 'Claude 3.5 Sonnet',
    provider: 'claude',
    enabled: false,
    requiresKey: true,
  },
  {
    id: 'claude/claude-3-opus',
    label: 'Claude 3 Opus',
    provider: 'claude',
    enabled: false,
    requiresKey: true,
  },

  // ===== xAI Grok (requires XAI_API_KEY) =====
  {
    id: 'grok/grok-2',
    label: 'Grok 2',
    provider: 'grok',
    enabled: false,
    requiresKey: true,
  },
  {
    id: 'grok/grok-beta',
    label: 'Grok Beta',
    provider: 'grok',
    enabled: false,
    requiresKey: true,
  },
];

export function getEnabledModels(): AiModelOption[] {
  return AI_MODELS.filter((model) => model.enabled);
}

export function getAllModels(): AiModelOption[] {
  return AI_MODELS;
}

export function getModelById(modelId: string): AiModelOption | null {
  return AI_MODELS.find((model) => model.id === modelId) ?? null;
}

export function getModelsByProvider(provider: AiModelOption['provider']): AiModelOption[] {
  return AI_MODELS.filter((m) => m.provider === provider);
}
