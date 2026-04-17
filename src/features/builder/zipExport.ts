import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import type { GeneratedFile } from '../projects/projectTypes';
import { slugify } from '@/lib/utils';

/**
 * Server-side export — generates a complete Vite project, uploads to Storage,
 * and triggers download via signed URL. Falls back to client-side on error.
 */
export async function exportProjectZip(
  projectName: string,
  files: GeneratedFile[],
  projectId?: string,
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('export-zip', {
      body: { projectId, projectName, files },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    if (!data?.url) throw new Error('No se recibió URL de descarga');

    // Trigger browser download from signed URL
    const a = document.createElement('a');
    a.href = data.url;
    a.download = `${slugify(projectName)}.zip`;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.warn('Server export failed, falling back to client:', err);
    await exportProjectZipClient(projectName, files);
  }
}

/**
 * Client-side fallback — minimal ZIP without scaffold.
 */
async function exportProjectZipClient(projectName: string, files: GeneratedFile[]): Promise<void> {
  const zip = new JSZip();
  files.forEach((f) => zip.file(f.path, f.content));
  const slug = slugify(projectName);

  if (!files.find((f) => f.path === 'package.json')) {
    zip.file('package.json', JSON.stringify({
      name: slug, version: '1.0.0', private: true, type: 'module',
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: { react: '^18.3.0', 'react-dom': '^18.3.0' },
      devDependencies: {
        vite: '^5.0.0', '@vitejs/plugin-react': '^4.0.0',
        typescript: '^5.0.0', '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0',
      },
    }, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
