// Credits feature types
export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'debit' | 'credit' | 'refund';
  amount: number;
  reason: string;
  model: string | null;
  project_id: string | null;
  created_at: string;
}

export type TaskComplexity = 'simple_task' | 'simple_edit' | 'medium_module' | 'complex_module' | 'full_app';
