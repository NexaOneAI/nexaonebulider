import { useEffect } from 'react';
import { useCreditsStore } from '@/features/credits/creditsStore';
import { useAuth } from './useAuth';

export function useCredits() {
  const { user } = useAuth();
  const store = useCreditsStore();

  useEffect(() => {
    if (user?.id) store.fetchTransactions(user.id);
  }, [user?.id]);

  return store;
}
