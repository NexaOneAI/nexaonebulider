/**
 * Modal to edit an existing project asset via the Lovable AI Gateway
 * (gemini-2.5-flash-image in edit mode). The original is preserved —
 * the result is uploaded as a brand new asset.
 */
import { useState } from 'react';
import { ImageIcon, Sparkles, Loader2, X, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { generateProjectImage, type ProjectAsset } from '@/features/assets/assetsService';
import { useAuthStore } from '@/features/auth/authStore';

interface Props {
  open: boolean;
  onClose: () => void;
  asset: ProjectAsset | null;
  projectId: string;
  onCreated?: () => void;
}

const IMAGE_COST = 4;

const EDIT_PRESETS = [
  'Hazla más oscura y cinematográfica',
  'Cambia la paleta a tonos cálidos',
  'Añade niebla y profundidad de campo',
  'Estilo ilustración minimalista',
];

export function EditAssetDialog({ open, onClose, asset, projectId, onCreated }: Props) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  if (!open || !asset) return null;

  const handleClose = () => {
    if (generating) return;
    setPrompt('');
    onClose();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    const res = await generateProjectImage({
      prompt: prompt.trim(),
      projectId,
      alt: asset.name,
      baseImageUrl: asset.publicUrl,
    });
    setGenerating(false);
    if (!res.ok) {
      toast.error(res.error || 'Error editando imagen');
      return;
    }
    toast.success(`Versión editada creada · -${res.creditsUsed ?? IMAGE_COST} créditos`);
    useAuthStore.getState().refreshProfile().catch(() => {});
    setPrompt('');
    onCreated?.();
    onClose();
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
          <Wand2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Editar imagen</h2>
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
          <div className="overflow-hidden rounded-md border border-border/50 bg-muted/30">
            <img src={asset.publicUrl} alt={asset.name} className="h-40 w-full object-cover" />
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">{asset.name}</p>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              ¿Qué quieres cambiar?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: cambia el cielo a un atardecer naranja"
              rows={3}
              disabled={generating}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {EDIT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={generating}
                onClick={() => setPrompt(p)}
                className="rounded-full border border-border/50 bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Editando con Nano Banana…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar versión editada ({IMAGE_COST} cr)
              </>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground/70">
            <ImageIcon className="-mt-0.5 mr-1 inline h-3 w-3" />
            La imagen original se conserva. La nueva se añade a la galería.
          </p>
        </div>
      </div>
    </div>
  );
}
