/**
 * Public read-only preview page.
 *
 * Loads the compiled HTML via the public edge function /get-shared-preview
 * and renders it inside a sandboxed iframe full-screen.
 *
 * No authentication required.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader } from '@/components/ui/Loader';
import { AlertTriangle, ExternalLink } from 'lucide-react';

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

export default function SharedPreview() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const url = useMemo(() => {
    if (!token) return '';
    return `https://${PROJECT_ID}.functions.supabase.co/get-shared-preview?token=${encodeURIComponent(token)}`;
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Token faltante');
      return;
    }
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) {
      setStatus('error');
      setErrorMsg('Token inválido');
      return;
    }
    // Probe the endpoint to surface 404/410 nicely instead of a blank iframe.
    let cancelled = false;
    fetch(url, { method: 'GET' })
      .then(async (resp) => {
        if (cancelled) return;
        if (resp.ok) {
          setStatus('ready');
        } else {
          setStatus('error');
          setErrorMsg(
            resp.status === 404
              ? 'Este link no existe o fue eliminado'
              : `Error cargando preview (${resp.status})`,
          );
        }
        // Always consume body to avoid leaks
        await resp.text().catch(() => {});
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(e instanceof Error ? e.message : 'Network error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, url]);

  // Title for SEO
  useEffect(() => {
    document.title = 'Preview compartido — Nexa One';
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader />
          <p className="text-sm">Cargando preview...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          No se pudo cargar el preview
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">{errorMsg}</p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Ir a Nexa One <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-white">
      <iframe
        src={url}
        className="h-full w-full"
        sandbox="allow-scripts allow-same-origin"
        title="Shared preview"
        style={{ border: 'none' }}
      />
      {/* Discreet attribution */}
      <a
        href="/"
        className="absolute bottom-3 right-3 rounded-full bg-foreground/80 px-3 py-1.5 text-xs font-medium text-background backdrop-blur-md transition-opacity hover:opacity-100 opacity-60"
      >
        Hecho con Nexa One
      </a>
    </div>
  );
}
