import { getProvider } from './aiRouter';
import type { AIStructuredResponse } from './aiTypes';
import { DEFAULT_MODEL } from '@/lib/constants';

export const aiService = {
  /**
   * Generate a new app from a prompt.
   * Routes through the provider architecture (currently Lovable Gateway).
   */
  async generateApp(prompt: string, model: string): Promise<AIStructuredResponse> {
    const provider = getProvider(model || DEFAULT_MODEL);
    return provider.generate(prompt, model || DEFAULT_MODEL);
  },

  /**
   * Edit an existing app incrementally.
   */
  async editApp(prompt: string, model: string, currentFiles: string): Promise<AIStructuredResponse> {
    const provider = getProvider(model || DEFAULT_MODEL);
    return provider.edit(prompt, currentFiles, model || DEFAULT_MODEL);
  },
};
