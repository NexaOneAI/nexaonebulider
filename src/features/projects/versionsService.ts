import { supabase } from '@/integrations/supabase/client';
import type { GeneratedFile } from './projectTypes';

export interface VersionEditsMeta {
  applied: number;
  failed: Array<{ path: string; index: number; reason: string }>;
  changed_paths: string[];
  bytes_saved: number;
  strategy?: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  prompt: string;
  model_used: string;
  generated_files: GeneratedFile[];
  created_at: string;
  /** Set when the version was produced from SEARCH/REPLACE diffs (edit). */
  editsMeta: VersionEditsMeta | null;
  /** True when version is a partial edit (diffs), false for full generations. */
  isDiff: boolean;
}

export const versionsService = {
  async list(projectId: string): Promise<ProjectVersion[]> {
    const { data, error } = await supabase
      .from('project_versions')
      .select(
        'id, project_id, version_number, prompt, model_used, generated_files, output_json, created_at',
      )
      .eq('project_id', projectId)
      .order('version_number', { ascending: false });
    if (error) return [];
    return (data ?? []).map((v) => {
      const out = (v.output_json ?? null) as { edits_meta?: VersionEditsMeta } | null;
      const editsMeta = (out?.edits_meta as VersionEditsMeta | undefined) ?? null;
      return {
        id: v.id,
        project_id: v.project_id,
        version_number: v.version_number,
        prompt: v.prompt,
        model_used: v.model_used,
        generated_files: (v.generated_files as unknown as GeneratedFile[]) || [],
        created_at: v.created_at,
        editsMeta,
        isDiff: !!editsMeta,
      };
    }) as ProjectVersion[];
  },
};
