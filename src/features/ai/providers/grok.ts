import type { AIProviderAdapter } from './types';
import type { AIStructuredResponse } from '../aiTypes';

/**
 * Grok (xAI) provider — placeholder.
 * Currently routes through Lovable Gateway in aiRouter.
 * Enable + implement when an XAI_API_KEY is configured.
 */
class GrokProvider implements AIProviderAdapter {
  readonly name = 'Grok (xAI)';

  async generate(_prompt: string): Promise<AIStructuredResponse> {
    throw new Error('Grok provider no está habilitado. Usa Lovable Gateway o configura XAI_API_KEY.');
  }

  async edit(_prompt: string, _currentFiles: string): Promise<AIStructuredResponse> {
    throw new Error('Grok provider no está habilitado. Usa Lovable Gateway o configura XAI_API_KEY.');
  }
}

export const grokProvider = new GrokProvider();
