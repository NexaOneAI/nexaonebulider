import { supabase } from '@/integrations/supabase/client';
import type { CreditTransaction, TaskComplexity } from './creditsTypes';
import { CREDIT_COSTS } from '@/lib/constants';

export const creditsService = {
  estimateCost(complexity: TaskComplexity): number {
    return CREDIT_COSTS[complexity];
  },

  async getTransactions(userId: string): Promise<CreditTransaction[]> {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []) as unknown as CreditTransaction[];
  },

  async deductCredits(userId: string, amount: number, reason: string, model?: string, projectId?: string): Promise<boolean> {
    // Update profile credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, is_unlimited')
      .eq('id', userId)
      .single();

    if (!profile) return false;
    if (!profile.is_unlimited && profile.credits < amount) return false;

    if (!profile.is_unlimited) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - amount })
        .eq('id', userId);
      if (updateError) return false;
    }

    // Record transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'debit' as const,
      amount,
      reason,
      model: model ?? null,
      project_id: projectId ?? null,
    });

    return true;
  },

  async refundCredits(userId: string, amount: number, reason: string): Promise<boolean> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, is_unlimited')
      .eq('id', userId)
      .single();

    if (!profile || profile.is_unlimited) return true;

    const { error } = await supabase
      .from('profiles')
      .update({ credits: profile.credits + amount })
      .eq('id', userId);
    if (error) return false;

    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'refund' as const,
      amount,
      reason,
    });

    return true;
  },
};
