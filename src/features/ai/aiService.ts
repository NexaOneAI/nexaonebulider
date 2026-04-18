import { getProvider } from './aiRouter';
import { inferProviderFromModel, type AIStructuredResponse } from './aiTypes';
import type { GenerateOptions } from './providers/types';
import type { GeneratedFile } from '../projects/projectTypes';
import { DEFAULT_MODEL } from '@/lib/constants';
import { generateAppStream, type StreamCallbacks } from './streamClient';

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

  /**
   * Streaming variant of generateApp. Calls generate-app-stream and emits
   * SSE events back via callbacks. Returns the full assembled assistant
   * content (used by the store to refresh credits / preview after the
   * server has already persisted the version).
   *
   * Falls back to non-streaming generateApp on error so the UX never
   * regresses.
   */
  async generateAppStream(
    prompt: string,
    model: string,
    opts: GenerateOptions & StreamCallbacks = {},
  ): Promise<{ ok: true; full: string } | { ok: false; error: string }> {
    const resolvedModel = model || DEFAULT_MODEL;
    try {
      const full = await generateAppStream(
        {
          prompt,
          model: resolvedModel,
          projectId: opts.projectId,
          userTier: opts.userTier,
          provider: opts.provider,
        },
        {
          onToken: opts.onToken,
          onFile: opts.onFile,
          onError: opts.onError,
          onDone: opts.onDone,
          signal: opts.signal,
        },
      );
      return { ok: true, full };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Stream error';
      return { ok: false, error: message };
    }
  },
};
