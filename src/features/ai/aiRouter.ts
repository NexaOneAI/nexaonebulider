import type { AIProviderAdapter } from './providers/types';
import { lovableProvider } from './providers/lovable';
import { openaiProvider } from './providers/openai';
import { geminiProvider } from './providers/gemini';
import { customProvider } from './providers/custom';

interface ProviderEntry {
  adapter: AIProviderAdapter;
  priority: number;
  enabled: boolean;
}

/**
 * AI Router — selects provider and handles fallback.
 * 
 * All models currently route through Lovable AI Gateway (which supports
 * OpenAI and Gemini models). When direct API keys are configured, 
 * the router can fall back to direct providers.
 */
const providers: Record<string, ProviderEntry> = {
  lovable: { adapter: lovableProvider, priority: 1, enabled: true },
  openai: { adapter: openaiProvider, priority: 2, enabled: false },
  gemini: { adapter: geminiProvider, priority: 3, enabled: false },
  custom: { adapter: customProvider, priority: 4, enabled: false },
};

/**
 * Get the best available provider for a model.
 * Models like "openai/gpt-5" or "google/gemini-3-flash-preview" 
 * all route through Lovable Gateway currently.
 */
export function getProvider(model: string): AIProviderAdapter {
  // All models currently go through Lovable Gateway
  // In the future, route based on model prefix:
  // - "openai/*" → openaiProvider (if enabled)
  // - "google/*" → geminiProvider (if enabled)
  // - "custom/*" → customProvider (if enabled)
  
  if (model.startsWith('openai/') && providers.openai.enabled) {
    return providers.openai.adapter;
  }
  if (model.startsWith('google/') && providers.gemini.enabled) {
    return providers.gemini.adapter;
  }
  if (model.startsWith('custom/') && providers.custom.enabled) {
    return providers.custom.adapter;
  }

  // Default: Lovable Gateway handles all models
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
