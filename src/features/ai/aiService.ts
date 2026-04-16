import { supabase } from '@/integrations/supabase/client';
import type { AIStructuredResponse } from './aiTypes';
import { DEFAULT_MODEL } from '@/lib/constants';

export const aiService = {
  async generateApp(prompt: string, model: string): Promise<AIStructuredResponse> {
    const { data, error } = await supabase.functions.invoke('generate-app', {
      body: { prompt, model: model || DEFAULT_MODEL, mode: 'create' },
    });

    if (error) throw new Error(error.message || 'Error al generar la app');
    if (data?.error) throw new Error(data.error);
    return data as AIStructuredResponse;
  },

  async editApp(prompt: string, model: string, currentFiles: string): Promise<AIStructuredResponse> {
    const { data, error } = await supabase.functions.invoke('generate-app', {
      body: { prompt, model: model || DEFAULT_MODEL, mode: 'edit', currentFiles },
    });

    if (error) throw new Error(error.message || 'Error al editar la app');
    if (data?.error) throw new Error(data.error);
    return data as AIStructuredResponse;
  },
};
