import { create } from 'zustand';
import { creditsService } from './creditsService';
import type { CreditTransaction, TaskComplexity } from './creditsTypes';

interface CreditsState {
  transactions: CreditTransaction[];
  loading: boolean;
  estimateCost: (complexity: TaskComplexity) => number;
  fetchTransactions: (userId: string) => Promise<void>;
}

export const useCreditsStore = create<CreditsState>((set) => ({
  transactions: [],
  loading: false,

  estimateCost: (complexity) => creditsService.estimateCost(complexity),

  fetchTransactions: async (userId) => {
    set({ loading: true });
    const transactions = await creditsService.getTransactions(userId);
    set({ transactions, loading: false });
  },
}));
