import { toast } from 'sonner';
import { useBuilderStore } from '../builderStore';
import { generatePreviewHtml } from '../preview';
import { activatePwa, isPwaActive } from '../pwaActivator';
import { generateProjectImage } from '@/features/assets/assetsService';
import { useAuthStore } from '@/features/auth/authStore';
import { detectAppKind } from '../suggestions/contextualActions';
import { supabase } from '@/integrations/supabase/client';

const KIND_VISUAL_HINT: Record<string, string> = {
  pos: 'cash register / shopping bag motif, retail vibe',
  crm: 'pipeline / handshake / contact card motif, business vibe',
  marketplace: 'storefront / tag / shopping motif, marketplace vibe',
  notes: 'notebook / pencil / sticky-note motif, productivity vibe',
  dashboard: 'chart / analytics motif, data vibe',
  landing: 'spark / rocket motif, marketing vibe',
  saas: 'cloud / workspace / dashboard motif, professional SaaS vibe',
  unknown: 'abstract geometric mark',
};

/**
 * Apply PWA scaffolding to the currently open project.
 *
 * Steps:
 *  1. Snapshot current files
 *  2. Run pure activator → new file list
 *  3. Commit to the builder store (so left-panel + preview update instantly)
 *  4. Persist a new version (project_versions) so it survives reloads
 */
export async function activatePwaForCurrentProject(opts: {
  iconUrl?: string;
  silent?: boolean;
} = {}): Promise<{ ok: boolean; changed: string[] }> {
  const store = useBuilderStore.getState();
  const { files, projectName, projectId, model } = store;

  if (!projectId) {
    toast.error('Abre o crea un proyecto primero');
    return { ok: false, changed: [] };
  }
  if (files.length === 0) {
    toast.error('Genera una app antes de activar PWA');
    return { ok: false, changed: [] };
  }

  const tid = opts.silent ? null : toast.loading('Activando PWA…');
  try {
    const result = activatePwa(files, projectName, { iconUrl: opts.iconUrl });

    // No-op: already PWA and nothing to refresh.
    if (result.changed.length === 0) {
      if (tid) toast.success('PWA ya estaba activo y al día', { id: tid });
      return { ok: true, changed: [] };
    }

    const previewCode = generatePreviewHtml(result.files, projectName, model);

    useBuilderStore.setState({
      files: result.files,
      previewCode,
      selectedFile: result.files.find((f) => f.path === 'public/manifest.webmanifest') ?? store.selectedFile,
      dirty: true,
    });

    // Persist immediately so reloads keep the PWA files.
    await useBuilderStore.getState().saveVersion('manual', 'PWA activado');

    if (tid) {
      toast.success(
        result.alreadyActive
          ? `PWA actualizado (${result.changed.length} archivo${result.changed.length === 1 ? '' : 's'})`
          : `PWA activado · ${result.changed.length} archivos creados`,
        { id: tid },
      );
    }
    return { ok: true, changed: result.changed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error activando PWA';
    if (tid) toast.error(msg, { id: tid });
    else toast.error(msg);
    return { ok: false, changed: [] };
  }
}

/**
 * Regenerate the PWA icon via the AI image gateway, then re-activate
 * the PWA so the manifest + index.html point to the new icon URL.
 * Cost: 4 credits (image-gen).
 */
export async function regeneratePwaIcon(): Promise<{ ok: boolean; url?: string }> {
  const store = useBuilderStore.getState();
  const { projectId, projectName, files } = store;

  if (!projectId) {
    toast.error('Abre un proyecto primero');
    return { ok: false };
  }
  if (files.length === 0) {
    toast.error('Genera una app primero');
    return { ok: false };
  }

  const tid = toast.loading('Generando icono con IA…');

  // Pull description from DB (best-effort; non-blocking on failure).
  let description = '';
  try {
    const { data } = await supabase
      .from('projects')
      .select('description')
      .eq('id', projectId)
      .maybeSingle();
    description = (data?.description ?? '').trim();
  } catch {
    // ignore — description is optional context
  }

  const kind = detectAppKind(projectName, files);
  const visualHint = KIND_VISUAL_HINT[kind] ?? KIND_VISUAL_HINT.unknown;

  const prompt = [
    `App icon for "${projectName || 'an app'}"${description ? ` — ${description.slice(0, 200)}` : ''}.`,
    `Category: ${kind}. ${visualHint}.`,
    'Modern minimalist flat design, vibrant gradient background, single bold central symbol,',
    'centered composition with generous safe padding (maskable-friendly, content within inner 70%),',
    'no text, no letters, no words, no typography,',
    'square 1:1 aspect ratio, suitable for iOS / Android home screen launcher.',
  ].join(' ');

  const res = await generateProjectImage({
    prompt,
    projectId,
    alt: `${projectName} PWA icon`,
  });
  if (!res.ok || !res.url) {
    toast.error(res.error || 'Error generando icono', { id: tid });
    return { ok: false };
  }

  toast.success(`Icono generado · -${res.creditsUsed ?? 4} créditos`, { id: tid });
  // Refresh credits in the topbar.
  useAuthStore.getState().refreshProfile().catch(() => {});

  // Apply (or refresh) PWA pointing at the new hosted icon.
  const apply = await activatePwaForCurrentProject({ iconUrl: res.url, silent: true });
  if (apply.ok) {
    toast.success('Icono aplicado al PWA');
  }
  return { ok: true, url: res.url };
}

export { isPwaActive };