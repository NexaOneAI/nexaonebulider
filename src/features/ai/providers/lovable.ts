import type { AIProviderAdapter } from './types';
import type { AIStructuredResponse } from '../aiTypes';
import { supabase } from '@/integrations/supabase/client';

/**
 * Lovable AI Gateway provider — calls edge function which uses
 * https://ai.gateway.lovable.dev/v1/chat/completions
 * 
 * This is a thin client-side adapter. The actual AI call happens
 * server-side in the generate-app edge function.
 */
class LovableProvider implements AIProviderAdapter {
  readonly name = 'Lovable AI Gateway';

  async generate(prompt: string, model?: string): Promise<AIStructuredResponse> {
    const { data, error } = await supabase.functions.invoke('generate-app', {
      body: { prompt, model, mode: 'create' },
    });
    if (error) throw new Error(error.message || 'Error en Lovable AI Gateway');
    if (data?.error) throw new Error(data.error);
    return data as AIStructuredResponse;
  }

  async edit(prompt: string, currentFiles: string, model?: string): Promise<AIStructuredResponse> {
    const { data, error } = await supabase.functions.invoke('generate-app', {
      body: { prompt, model, mode: 'edit', currentFiles },
    });
    if (error) throw new Error(error.message || 'Error en Lovable AI Gateway');
    if (data?.error) throw new Error(data.error);
    return data as AIStructuredResponse;
  }
}

export const lovableProvider = new LovableProvider();
