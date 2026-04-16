import { openaiProvider, claudeProvider, geminiProvider, customProvider } from './providers/openai';
import type { AIProviderAdapter } from './providers/openai';
import { AI_MODELS } from '@/lib/constants';

const providerMap: Record<string, AIProviderAdapter> = {
  [AI_MODELS.OPENAI]: openaiProvider,
  [AI_MODELS.CLAUDE]: claudeProvider,
  [AI_MODELS.GEMINI]: geminiProvider,
  [AI_MODELS.CUSTOM]: customProvider,
};

export function getProvider(model: string): AIProviderAdapter {
  return providerMap[model] ?? providerMap[AI_MODELS.OPENAI];
}
