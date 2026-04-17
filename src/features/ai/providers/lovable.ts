import type { AIProviderAdapter } from './types';
import type { AIStructuredResponse } from '../aiTypes';
import { supabase } from '@/integrations/supabase/client';
import type { GeneratedFile } from '../../projects/projectTypes';

export type Tier = 'simple_task' | 'simple_edit' | 'medium_module' | 'complex_module' | 'full_app';

interface GenerateOptions {
  projectId?: string;
  userTier?: Tier;
}

/**
 * Lovable AI Gateway provider — calls edge functions:
 * - generate-app for new apps
 * - chat-edit for incremental edits (with diffs + history)
 */
class LovableProvider implements AIProviderAdapter {
  readonly name = 'Lovable AI Gateway';

  async generate(prompt: string, model?: string, opts: GenerateOptions = {}): Promise<AIStructuredResponse> {
    const { data, error } = await supabase.functions.invoke('generate-app', {
      body: { prompt, model, projectId: opts.projectId, userTier: opts.userTier },
    });
    if (error) throw new Error(error.message || 'Error en Lovable AI Gateway');
    if (data?.error) throw new Error(data.error);
    return data as AIStructuredResponse;
  }

  async edit(
    prompt: string,
    currentFiles: string | GeneratedFile[],
    model?: string,
    opts: GenerateOptions = {},
  ): Promise<AIStructuredResponse> {
    const filesArray = typeof currentFiles === 'string' ? JSON.parse(currentFiles) : currentFiles;
    const { data, error } = await supabase.functions.invoke('chat-edit', {
      body: {
        prompt,
        model,
        currentFiles: filesArray,
        projectId: opts.projectId,
        userTier: opts.userTier,
      },
    });
    if (error) throw new Error(error.message || 'Error en chat-edit');
    if (data?.error) throw new Error(data.error);
    return data as AIStructuredResponse;
  }
}

export const lovableProvider = new LovableProvider();
