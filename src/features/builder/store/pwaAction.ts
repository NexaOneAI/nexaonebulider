import { toast } from 'sonner';
import { useBuilderStore } from '../builderStore';
import { generatePreviewHtml } from '../preview';
import { activatePwa, isPwaActive } from '../pwaActivator';
import { generateProjectImage } from '@/features/assets/assetsService';
import { useAuthStore } from '@/features/auth/authStore';

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
  const { projectId, projectName } = store;

  if (!projectId) {
    toast.error('Abre un proyecto primero');
    return { ok: false };
  }

  const tid = toast.loading('Generando icono con IA…');
  const prompt = [
    `App icon for "${projectName || 'an app'}".`,
    'Modern minimalist flat design, vibrant gradient, single bold central symbol,',
    'centered composition with safe padding (maskable-friendly), no text,',
    'square 1:1, suitable for iOS / Android home screen.',
  ].join(' ');

  const res = await generateProjectImage({
    prompt,
    projectId,
    alt: `${projectName} app icon`,
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