// Billing feature types
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
