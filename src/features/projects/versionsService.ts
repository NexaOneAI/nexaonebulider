import { supabase } from '@/integrations/supabase/client';
import type { GeneratedFile } from './projectTypes';

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  prompt: string;
  model_used: string;
  generated_files: GeneratedFile[];
  created_at: string;
}

export const versionsService = {
  async list(projectId: string): Promise<ProjectVersion[]> {
    const { data, error } = await supabase
      .from('project_versions')
      .select('id, project_id, version_number, prompt, model_used, generated_files, created_at')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false });
    if (error) return [];
    return (data ?? []).map((v) => ({
      ...v,
      generated_files: (v.generated_files as unknown as GeneratedFile[]) || [],
    })) as ProjectVersion[];
  },
};
