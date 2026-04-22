import { supabase } from '@/integrations/supabase/client';

export interface OnboardingState {
  user_id: string;
  completed: boolean;
  current_step: number;
  welcome_credits_granted: boolean;
  completed_at: string | null;
}

export const onboardingService = {
  /** Returns the current onboarding row, creating it if missing. */
  async getOrCreate(userId: string): Promise<OnboardingState | null> {
    const { data } = await supabase
      .from('user_onboarding')
      .select('user_id, completed, current_step, welcome_credits_granted, completed_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) return data as OnboardingState;

    const { data: created, error } = await supabase
      .from('user_onboarding')
      .insert({ user_id: userId })
      .select('user_id, completed, current_step, welcome_credits_granted, completed_at')
      .single();
    if (error) return null;
    return created as OnboardingState;
  },

  async setStep(userId: string, step: number): Promise<void> {
    await supabase
      .from('user_onboarding')
      .update({ current_step: step })
      .eq('user_id', userId);
  },

  async complete(userId: string): Promise<void> {
    await supabase
      .from('user_onboarding')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', userId);
  },

  async skip(userId: string): Promise<void> {
    await supabase
      .from('user_onboarding')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', userId);
  },

  /** Idempotent: grants 25 credits the first time only. */
  async grantWelcomeCredits(userId: string, amount = 25): Promise<{ ok: boolean; already?: boolean; credits?: number }> {
    const { data, error } = await supabase.rpc('grant_welcome_credits', {
      _user_id: userId,
      _amount: amount,
    });
    if (error) return { ok: false };
    return (data as { ok: boolean; already?: boolean; credits?: number }) ?? { ok: false };
  },
};