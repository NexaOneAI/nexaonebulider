import type { AIProviderAdapter } from './types';
import type { AIStructuredResponse } from '../aiTypes';

/**
 * Gemini direct provider — placeholder for future direct API integration.
 * Currently falls through to Lovable Gateway which supports Gemini models.
 */
class GeminiProvider implements AIProviderAdapter {
  readonly name = 'Gemini Direct';

  async generate(_prompt: string): Promise<AIStructuredResponse> {
    throw new Error('Gemini direct provider not configured. Use Lovable AI Gateway.');
  }

  async edit(_prompt: string, _currentFiles: string): Promise<AIStructuredResponse> {
    throw new Error('Gemini direct provider not configured. Use Lovable AI Gateway.');
  }
}

export const geminiProvider = new GeminiProvider();
