import { CREDIT_COSTS } from '@/lib/constants';
import type { TaskComplexity, CreditTransaction } from './creditsTypes';

export const creditsService = {
  estimateCost(complexity: TaskComplexity): number {
    return CREDIT_COSTS[complexity];
  },

  async getTransactions(_userId: string): Promise<CreditTransaction[]> {
    // Will be replaced with Supabase query
    return [];
  },

  async deductCredits(_userId: string, _amount: number, _reason: string): Promise<boolean> {
    // Will be replaced with edge function call
    return true;
  },

  async refundCredits(_userId: string, _amount: number, _reason: string): Promise<boolean> {
    // Will be replaced with edge function call
    return true;
  },
};
