// Project feature types
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
