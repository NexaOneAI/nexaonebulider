/**
 * manualSaveService — creates a `project_versions` row from the current
 * in-memory file state without going through the AI. Used by:
 *   • Manual "Guardar versión" button click in the header
 *   • Auto-save after 30s of editor inactivity
 *
 * Versions created here are flagged with model_used = "manual-save" so the
 * VersionHistory panel can distinguish them from AI generations / edits.
 */
import { supabase } from '@/integrations/supabase/client';
import type { GeneratedFile } from './projectTypes';

export interface ManualSaveArgs {
  projectId: string;
  files: GeneratedFile[];
  /** "manual" → user clicked the button. "auto" → debounce timer fired. */
  trigger: 'manual' | 'auto';
  /** Optional message describing what changed (manual saves only) */
  note?: string;
}

export interface ManualSaveResult {
  versionId: string;
  versionNumber: number;
}

export const manualSaveService = {
  /**
   * Persist a checkpoint version. Returns the new version id so callers
   * can chain a GitHub push.
   */
  async save({
    projectId,
    files,
    trigger,
    note,
  }: ManualSaveArgs): Promise<ManualSaveResult> {
    if (!projectId) throw new Error('projectId requerido');
    if (!files.length) throw new Error('No hay archivos para guardar');

    // Fetch current max version_number for this project
    const { data: latest } = await supabase
      .from('project_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = (latest?.version_number ?? 0) + 1;
    const prompt =
      trigger === 'manual'
        ? note?.trim() || `[guardado manual] checkpoint v${nextNumber}`
        : `[auto-save] cambios manuales en el editor`;

    const { data, error } = await supabase
      .from('project_versions')
      .insert({
        project_id: projectId,
        version_number: nextNumber,
        prompt,
        model_used: trigger === 'manual' ? 'manual-save' : 'auto-save',
        generated_files: files as unknown as never,
      })
      .select('id, version_number')
      .single();

    if (error) throw new Error(error.message);
    return { versionId: data.id, versionNumber: data.version_number };
  },
};
