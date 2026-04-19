/**
 * Project Knowledge — instrucciones persistentes que se inyectan en cada
 * prompt enviado a la IA. Equivalente al "Knowledge" de Lovable Settings.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ProjectKnowledge {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  enabled: boolean;
  updated_at: string;
}

export async function getKnowledge(projectId: string): Promise<ProjectKnowledge | null> {
  const { data, error } = await supabase
    .from('project_knowledge')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProjectKnowledge | null) ?? null;
}

export async function upsertKnowledge(
  projectId: string,
  userId: string,
  content: string,
  enabled: boolean,
): Promise<ProjectKnowledge> {
  const { data, error } = await supabase
    .from('project_knowledge')
    .upsert(
      { project_id: projectId, user_id: userId, content, enabled },
      { onConflict: 'project_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return data as ProjectKnowledge;
}
