/**
 * Cliente para deploy a producción vía edge function `deploy-netlify`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { GeneratedFile } from '@/features/projects/projectTypes';

export interface Deployment {
  id: string;
  project_id: string;
  provider: 'netlify' | 'vercel' | 'custom';
  url: string | null;
  site_id: string | null;
  status: 'pending' | 'building' | 'live' | 'failed';
  error_message: string | null;
  created_at: string;
}

export async function listDeployments(projectId: string): Promise<Deployment[]> {
  const { data, error } = await supabase
    .from('project_deployments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data as Deployment[]) ?? [];
}

export interface DeployResult {
  deploymentId: string;
  url: string;
  siteId: string;
}

export async function deployToNetlify(
  projectId: string,
  projectName: string,
  files: GeneratedFile[],
  previousSiteId?: string | null,
): Promise<DeployResult> {
  const { data, error } = await supabase.functions.invoke('deploy-netlify', {
    body: {
      projectId,
      projectName,
      files: files.map((f) => ({ path: f.path, content: f.content })),
      siteId: previousSiteId || undefined,
    },
  });
  if (error) throw new Error(error.message || 'Deploy failed');
  if (!data?.url) throw new Error(data?.error || 'Deploy returned no URL');
  return data as DeployResult;
}
