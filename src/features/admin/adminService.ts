import type { AdminStats } from './adminTypes';

export const adminService = {
  async getStats(): Promise<AdminStats> {
    return { total_users: 0, total_projects: 0, total_credits_used: 0, active_users_today: 0 };
  },

  async getUsers(): Promise<import('./adminTypes').AdminUser[]> {
    return [];
  },

  async assignCredits(_userId: string, _amount: number): Promise<boolean> {
    return true;
  },

  async toggleUnlimited(_userId: string, _unlimited: boolean): Promise<boolean> {
    return true;
  },
};
