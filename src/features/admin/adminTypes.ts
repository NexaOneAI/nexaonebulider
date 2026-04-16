export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  credits: number;
  is_unlimited: boolean;
  plan: string;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_projects: number;
  total_credits_used: number;
  active_users_today: number;
}
