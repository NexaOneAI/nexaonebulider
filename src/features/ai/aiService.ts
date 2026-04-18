import { getProvider } from './aiRouter';
import { inferProviderFromModel, type AIStructuredResponse } from './aiTypes';
import type { GenerateOptions } from './providers/types';
import type { GeneratedFile } from '../projects/projectTypes';
import { DEFAULT_MODEL } from '@/lib/constants';

/**
 * High-level AI service. Selects an adapter via aiRouter and always passes
 * an explicit `provider` derived from the model id so the backend can route
 * without re-parsing the model string.
 */
export const aiService = {
  async generateApp(
    prompt: string,
    model: string,
    opts: GenerateOptions = {},
  ): Promise<AIStructuredResponse> {
    const resolvedModel = model || DEFAULT_MODEL;
    const adapter = getProvider(resolvedModel);
    const provider = opts.provider ?? inferProviderFromModel(resolvedModel);
    return adapter.generate(prompt, resolvedModel, { ...opts, provider });
  },

  async editApp(
    prompt: string,
    model: string,
    currentFiles: GeneratedFile[] | string,
    opts: GenerateOptions = {},
  ): Promise<AIStructuredResponse> {
    const resolvedModel = model || DEFAULT_MODEL;
    const adapter = getProvider(resolvedModel);
    const provider = opts.provider ?? inferProviderFromModel(resolvedModel);
    return adapter.edit(prompt, currentFiles, resolvedModel, { ...opts, provider });
  },
};
