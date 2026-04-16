import { getProvider } from './aiRouter';
import type { AIStructuredResponse } from './aiTypes';
import { delay } from '@/lib/utils';

export const aiService = {
  async generateApp(prompt: string, model: string): Promise<AIStructuredResponse> {
    const provider = getProvider(model);
    // Simulate network latency — will be replaced with real edge function
    await delay(1500);
    return provider.generate(prompt);
  },

  async editApp(prompt: string, model: string, currentFiles: string): Promise<AIStructuredResponse> {
    const provider = getProvider(model);
    await delay(1200);
    return provider.edit(prompt, currentFiles);
  },
};
