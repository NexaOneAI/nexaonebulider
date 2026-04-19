import { supabase } from '@/integrations/supabase/client';

export interface ProjectAsset {
  name: string;
  path: string;
  publicUrl: string;
  size: number;
  createdAt: string;
  contentType?: string;
}

const BUCKET = 'project-assets';

/**
 * Lists all images for the current user under {userId}/{projectId}/.
 * The bucket is public so we can return public URLs directly.
 */
export async function listProjectAssets(projectId: string): Promise<ProjectAsset[]> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return [];

  const folder = `${user.id}/${projectId}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) {
    console.error('listProjectAssets error', error);
    return [];
  }

  return (data || [])
    .filter((f) => f.name && !f.name.endsWith('/'))
    .map((f) => {
      const path = `${folder}/${f.name}`;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return {
        name: f.name,
        path,
        publicUrl: pub.publicUrl,
        size: (f.metadata as any)?.size ?? 0,
        createdAt: (f as any).created_at ?? new Date().toISOString(),
        contentType: (f.metadata as any)?.mimetype,
      };
    });
}

export async function deleteProjectAsset(path: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Calls the image-gen edge function to create a new image bound to the
 * current project. Used by the explicit /image command UI.
 *
 * If `baseImageUrl` is provided, the gateway is called in *edit* mode
 * (gemini reads the source image and applies the prompt).
 */
export async function generateProjectImage(input: {
  prompt: string;
  projectId: string;
  alt?: string;
  baseImageUrl?: string;
}): Promise<{
  ok: boolean;
  url?: string;
  path?: string;
  alt?: string;
  creditsUsed?: number;
  creditsRemaining?: number;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke('image-gen', {
    body: {
      prompt: input.prompt,
      projectId: input.projectId,
      alt: input.alt,
      baseImageUrl: input.baseImageUrl,
    },
  });
  if (error) return { ok: false, error: error.message || 'Error generando imagen' };
  if (data?.error) return { ok: false, error: data.error };
  return {
    ok: true,
    url: data.url,
    path: data.path,
    alt: data.alt,
    creditsUsed: data.credits_used,
    creditsRemaining: data.credits_remaining,
  };
}
