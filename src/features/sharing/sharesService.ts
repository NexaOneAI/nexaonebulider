/**
 * Service for the public share feature.
 *
 * Storage: `project_shares` table.
 * RLS: only the project owner can read/create/update/delete their shares.
 * The public preview is served by the `get-shared-preview` edge function
 * (no auth) using the share token.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ProjectShare {
  id: string;
  project_id: string;
  user_id: string;
  token: string;
  enabled: boolean;
  pinned_version_id: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 32-char URL-safe random token (base64url, 24 bytes ≈ 32 chars). */
function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let b64 = btoa(String.fromCharCode(...bytes));
  // URL-safe base64
  b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}

/** Builds the public share URL the user can copy/paste. */
export function buildShareUrl(token: string): string {
  return `${window.location.origin}/share/${token}`;
}

export const sharesService = {
  /** Returns the existing share for this project (or null). */
  async get(projectId: string): Promise<ProjectShare | null> {
    const { data, error } = await supabase
      .from('project_shares')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw error;
    return (data as ProjectShare) ?? null;
  },

  /** Creates a new share with a fresh token (or returns the existing one). */
  async createOrGet(projectId: string): Promise<ProjectShare> {
    const existing = await this.get(projectId);
    if (existing) return existing;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('project_shares')
      .insert({
        project_id: projectId,
        user_id: user.id,
        token: generateToken(),
        enabled: true,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as ProjectShare;
  },

  /** Toggles enabled flag. */
  async setEnabled(shareId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('project_shares')
      .update({ enabled })
      .eq('id', shareId);
    if (error) throw error;
  },

  /** Rotates the public token (invalidates old links). */
  async rotateToken(shareId: string): Promise<ProjectShare> {
    const { data, error } = await supabase
      .from('project_shares')
      .update({ token: generateToken() })
      .eq('id', shareId)
      .select('*')
      .single();
    if (error) throw error;
    return data as ProjectShare;
  },

  /** Deletes the share entirely (URL stops working immediately). */
  async remove(shareId: string): Promise<void> {
    const { error } = await supabase
      .from('project_shares')
      .delete()
      .eq('id', shareId);
    if (error) throw error;
  },
};
