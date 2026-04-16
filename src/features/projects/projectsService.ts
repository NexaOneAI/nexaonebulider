import { supabase } from '@/integrations/supabase/client';
import type { Project } from './projectTypes';

export const projectsService = {
  async list(userId: string): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects' as never)
        .select('*')
        .eq('user_id' as never, userId as never)
        .order('updated_at' as never, { ascending: false });
      if (error) throw error;
      return (data as unknown as Project[]) ?? [];
    } catch {
      return [];
    }
  },

  async get(projectId: string): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('projects' as never)
        .select('*')
        .eq('id' as never, projectId as never)
        .single();
      if (error) return null;
      return data as unknown as Project;
    } catch {
      return null;
    }
  },

  async create(project: Partial<Project>): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('projects' as never)
        .insert(project as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Project;
    } catch {
      return null;
    }
  },

  async update(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('projects' as never)
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id' as never, projectId as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Project;
    } catch {
      return null;
    }
  },

  async remove(projectId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('projects' as never)
        .delete()
        .eq('id' as never, projectId as never);
      return !error;
    } catch {
      return false;
    }
  },
};
