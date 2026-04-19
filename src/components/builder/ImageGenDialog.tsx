import { useState } from 'react';
import { ImageIcon, Sparkles, Copy, Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { generateProjectImage } from '@/features/assets/assetsService';
import { useAuthStore } from '@/features/auth/authStore';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

const IMAGE_COST = 4;

export function ImageGenDialog({ open, onClose, projectId }: Props) {
  const [prompt, setPrompt] = useState('');
  const [alt, setAlt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ url: string; alt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const reset = () => {
    setPrompt('');
    setAlt('');
    setResult(null);
    setCopied(false);
  };

  const handleClose = () => {
    if (generating) return;
    reset();
    onClose();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!projectId) {
      toast.error('Abre un proyecto primero');
      return;
    }
    setGenerating(true);
    setResult(null);
    const res = await generateProjectImage({
      prompt: prompt.trim(),
      projectId,
      alt: alt.trim() || undefined,
    });
    setGenerating(false);
    if (!res.ok) {
      toast.error(res.error || 'Error generando imagen');
      return;
    }
    setResult({ url: res.url!, alt: res.alt || prompt.slice(0, 80) });
    toast.success(`Imagen generada · -${res.creditsUsed ?? IMAGE_COST} créditos`);
    // Refresh profile credits
    useAuthStore.getState().refreshProfile().catch(() => {});
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      toast.success('URL copiada');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleCopyImgTag = async () => {
    if (!result) return;
    const tag = `<img src="${result.url}" alt="${result.alt.replace(/"/g, '&quot;')}" />`;
    try {
      await navigator.clipboard.writeText(tag);
      toast.success('Etiqueta <img> copiada');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-elevated animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
          <ImageIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Generar imagen</h2>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {IMAGE_COST} créditos
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7"
            onClick={handleClose}
            disabled={generating}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Descripción de la imagen
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: foto cinematográfica de un equipo de oficina trabajando con laptops, luz cálida, profundidad de campo"
              rows={3}
              disabled={generating}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Texto alternativo (opcional)
            </label>
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Equipo trabajando con laptops"
              disabled={generating}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando con Nano Banana…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar imagen ({IMAGE_COST} cr)
              </>
            )}
          </Button>

          {result && (
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/50 p-2 animate-in fade-in">
              <div className="overflow-hidden rounded-md bg-muted/30">
                <img src={result.url} alt={result.alt} className="h-48 w-full object-cover" />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3 w-3" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3 w-3" />
                      Copiar URL
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={handleCopyImgTag}
                >
                  <Copy className="mr-1.5 h-3 w-3" />
                  {'<img>'}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                La imagen ya está guardada en los assets del proyecto. Pégala en cualquier archivo o
                pídele al chat "usa la imagen <code className="font-mono">{result.url.split('/').pop()}</code>".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
