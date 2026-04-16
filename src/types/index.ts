export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  credits: number;
  is_unlimited: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  prompt: string;
  model_used: string;
  output_json: Record<string, unknown> | null;
  generated_files: GeneratedFile[];
  preview_code: string | null;
  created_at: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface AIMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string;
  created_at: string;
}

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

export interface Purchase {
  id: string;
  user_id: string;
  package_name: string;
  amount_mxn: number;
  credits: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_provider: string;
  external_payment_id: string | null;
  created_at: string;
}

export interface AppExport {
  id: string;
  project_id: string;
  export_type: 'zip' | 'deploy';
  zip_url: string | null;
  created_at: string;
}

export interface AIProvider {
  id: string;
  name: string;
  label: string;
  available: boolean;
}

export interface AIStructuredResponse {
  projectName: string;
  description: string;
  files: GeneratedFile[];
  dependencies: Record<string, string>;
  pages: string[];
  components: string[];
}

export type CreditCost = {
  simple_task: 2;
  simple_edit: 3;
  medium_module: 5;
  complex_module: 8;
  full_app: 12;
};

export const CREDIT_COSTS: CreditCost = {
  simple_task: 2,
  simple_edit: 3,
  medium_module: 5,
  complex_module: 8,
  full_app: 12,
};

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_mxn: number;
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 50, price_mxn: 99 },
  { id: 'builder', name: 'Builder', credits: 150, price_mxn: 249, popular: true },
  { id: 'pro', name: 'Pro', credits: 500, price_mxn: 699 },
  { id: 'enterprise', name: 'Enterprise', credits: 2000, price_mxn: 2499 },
];
