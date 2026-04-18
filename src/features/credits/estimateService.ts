import { supabase } from '@/integrations/supabase/client';

export interface CostEstimate {
  complexity: string;
  estimated_cost: number;
  can_afford: boolean;
  current_credits: number;
}

/**
 * Calls the `estimate-cost` edge function to get a heuristic credit cost
 * for a given prompt before actually invoking generate-app / chat-edit.
 */
export async function estimateCost(
  prompt: string,
  mode: 'create' | 'edit',
): Promise<CostEstimate | null> {
  if (!prompt.trim()) return null;
  try {
    const { data, error } = await supabase.functions.invoke('estimate-cost', {
      body: { prompt, mode },
    });
    if (error || !data || data.error) return null;
    return data as CostEstimate;
  } catch {
    return null;
  }
}
