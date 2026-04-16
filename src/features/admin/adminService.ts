import { supabase } from '@/integrations/supabase/client';
import type { AdminStats, AdminUser } from './adminTypes';

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'get_stats' },
    });
    if (error) throw error;
    return data.stats;
  },

  async getUsers(): Promise<AdminUser[]> {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'list_users' },
    });
    if (error) throw error;
    return data.users ?? [];
  },

  async assignCredits(userId: string, amount: number, reason?: string): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'assign_credits', userId, amount, reason },
    });
    if (error) throw error;
    return data.success;
  },

  async toggleUnlimited(userId: string, unlimited: boolean): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'toggle_unlimited', userId, unlimited },
    });
    if (error) throw error;
    return data.success;
  },

  async changePlan(userId: string, plan: string): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'change_plan', userId, plan },
    });
    if (error) throw error;
    return data.success;
  },
};
