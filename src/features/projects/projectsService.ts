import { supabase } from '@/integrations/supabase/client';
import type { Project } from './projectTypes';

export const projectsService = {
  async list(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Project[];
  },

  async get(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (error) return null;
    return data as Project;
  },

  async create(project: { user_id: string; name: string; description?: string }): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  },

  async update(projectId: string, updates: { name?: string; description?: string; status?: 'draft' | 'active' | 'archived' }): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  },

  async remove(projectId: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    return !error;
  },
};
