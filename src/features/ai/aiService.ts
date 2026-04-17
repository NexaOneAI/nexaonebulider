import { getProvider } from './aiRouter';
import type { AIStructuredResponse } from './aiTypes';
import type { GenerateOptions } from './providers/types';
import type { GeneratedFile } from '../projects/projectTypes';
import { DEFAULT_MODEL } from '@/lib/constants';

export const aiService = {
  async generateApp(
    prompt: string,
    model: string,
    opts: GenerateOptions = {},
  ): Promise<AIStructuredResponse> {
    const provider = getProvider(model || DEFAULT_MODEL);
    return provider.generate(prompt, model || DEFAULT_MODEL, opts);
  },

  async editApp(
    prompt: string,
    model: string,
    currentFiles: GeneratedFile[] | string,
    opts: GenerateOptions = {},
  ): Promise<AIStructuredResponse> {
    const provider = getProvider(model || DEFAULT_MODEL);
    return provider.edit(prompt, currentFiles, model || DEFAULT_MODEL, opts);
  },
};
