import type { AIProviderAdapter } from './types';
import type { AIStructuredResponse } from '../aiTypes';

/**
 * OpenAI direct provider — placeholder for future direct API integration.
 * Currently falls through to Lovable Gateway which supports OpenAI models.
 */
class OpenAIProvider implements AIProviderAdapter {
  readonly name = 'OpenAI Direct';

  async generate(_prompt: string): Promise<AIStructuredResponse> {
    throw new Error('OpenAI direct provider not configured. Use Lovable AI Gateway.');
  }

  async edit(_prompt: string, _currentFiles: string): Promise<AIStructuredResponse> {
    throw new Error('OpenAI direct provider not configured. Use Lovable AI Gateway.');
  }
}

export const openaiProvider = new OpenAIProvider();
