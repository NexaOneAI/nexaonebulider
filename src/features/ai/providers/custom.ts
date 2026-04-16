import type { AIProviderAdapter } from './types';
import type { AIStructuredResponse } from '../aiTypes';

/**
 * Custom provider — for self-hosted or third-party API integrations.
 * Implement your own logic here when ready.
 */
class CustomProvider implements AIProviderAdapter {
  readonly name = 'Custom Provider';

  async generate(_prompt: string): Promise<AIStructuredResponse> {
    throw new Error('Custom provider not configured.');
  }

  async edit(_prompt: string, _currentFiles: string): Promise<AIStructuredResponse> {
    throw new Error('Custom provider not configured.');
  }
}

export const customProvider = new CustomProvider();
