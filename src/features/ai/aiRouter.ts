import type { AIProviderAdapter } from './providers/types';
import { lovableProvider } from './providers/lovable';
import { openaiProvider } from './providers/openai';
import { geminiProvider } from './providers/gemini';
import { claudeProvider } from './providers/claude';
import { grokProvider } from './providers/grok';
import { customProvider } from './providers/custom';

interface ProviderEntry {
  adapter: AIProviderAdapter;
  priority: number;
  enabled: boolean;
}

/**
 * AI Router — selects provider and handles fallback.
 *
 * Default: all models route through the Lovable AI Gateway edge function
 * (which natively supports OpenAI + Gemini). Claude and Grok are registered
 * as placeholders and will activate once their direct adapters are enabled.
 */
const providers: Record<string, ProviderEntry> = {
  lovable: { adapter: lovableProvider, priority: 1, enabled: true },
  openai: { adapter: openaiProvider, priority: 2, enabled: false },
  gemini: { adapter: geminiProvider, priority: 3, enabled: false },
  claude: { adapter: claudeProvider, priority: 4, enabled: false },
  grok: { adapter: grokProvider, priority: 5, enabled: false },
  custom: { adapter: customProvider, priority: 6, enabled: false },
};

/**
 * Get the best available provider for a model id.
 * Routes by prefix: "openai/", "google/", "claude/", "grok/", "custom/".
 * Falls back to Lovable Gateway when the direct adapter isn't enabled.
 */
export function getProvider(model: string): AIProviderAdapter {
  if (model.startsWith('openai/') && providers.openai.enabled) return providers.openai.adapter;
  if (model.startsWith('google/') && providers.gemini.enabled) return providers.gemini.adapter;
  if (model.startsWith('claude/') && providers.claude.enabled) return providers.claude.adapter;
  if (model.startsWith('grok/') && providers.grok.enabled) return providers.grok.adapter;
  if (model.startsWith('custom/') && providers.custom.enabled) return providers.custom.adapter;

  // Default: Lovable Gateway (handles OpenAI + Gemini natively today)
  return providers.lovable.adapter;
}

/**
 * Get fallback providers in priority order (excluding the failed one)
 */
export function getFallbackProviders(failedProvider: string): AIProviderAdapter[] {
  return Object.entries(providers)
    .filter(([key, entry]) => key !== failedProvider && entry.enabled)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([, entry]) => entry.adapter);
}

/**
 * Enable/disable a provider at runtime
 */
export function setProviderEnabled(providerId: string, enabled: boolean): void {
  if (providers[providerId]) {
    providers[providerId].enabled = enabled;
  }
}
