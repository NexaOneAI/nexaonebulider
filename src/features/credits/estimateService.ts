import { estimateCost as estimateByActionKey } from '@/features/ai/aiClient';
import { supabase } from '@/integrations/supabase/client';

export interface CostEstimate {
  complexity: string;
  estimated_cost: number;
  can_afford: boolean;
  current_credits: number;
}

/**
 * Heuristic estimation from prompt + mode (server-side classification).
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

/**
 * Direct estimation when the caller already knows the actionKey/tier.
 * Thin re-export of aiClient.estimateCost.
 */
export async function estimateCostByActionKey(
  actionKey: string,
): Promise<CostEstimate | null> {
  try {
    const data = await estimateByActionKey(actionKey);
    if (!data || data.error) return null;
    return data as CostEstimate;
  } catch {
    return null;
  }
}
