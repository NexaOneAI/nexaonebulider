import type { Purchase } from './billingTypes';

export const billingService = {
  async getPurchases(_userId: string): Promise<Purchase[]> {
    return [];
  },

  async createPayment(_packageId: string, _userId: string): Promise<{ url: string } | null> {
    // Will integrate with Mercado Pago via edge function
    return null;
  },
};
