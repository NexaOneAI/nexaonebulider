import { Lightbulb, Package, PlusCircle, Boxes, History, QrCode, AlertTriangle, RotateCcw, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Suggestion {
  id: string;
  label: string;
  icon: typeof Package;
  tone: 'primary' | 'accent' | 'warning' | 'muted';
}

const SUGGESTIONS: Suggestion[] = [
  { id: 'edit-catalog', label: 'Editar catálogo', icon: Package, tone: 'primary' },
  { id: 'add-product', label: 'Agregar producto', icon: PlusCircle, tone: 'primary' },
  { id: 'adjust-inventory', label: 'Ajustar inventario', icon: Boxes, tone: 'accent' },
  { id: 'view-history', label: 'Ver historial de ventas', icon: History, tone: 'accent' },
  { id: 'enable-qr', label: 'Activar entrada con QR', icon: QrCode, tone: 'primary' },
  { id: 'out-of-stock', label: 'Productos sin stock', icon: AlertTriangle, tone: 'warning' },
  { id: 'restock', label: 'Reabastecer producto', icon: RotateCcw, tone: 'muted' },
  { id: 'reports', label: 'Ver reportes', icon: BarChart3, tone: 'accent' },
];

const toneClasses: Record<Suggestion['tone'], string> = {
  primary: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
  accent: 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20',
  warning: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
  muted: 'bg-muted text-muted-foreground border-border hover:bg-muted/70',
};

interface PosSuggestionsProps {
  onSelect?: (id: string) => void;
}

export function PosSuggestions({ onSelect }: PosSuggestionsProps) {
  return (
    <Card className="border-border bg-card/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Acciones rápidas</h2>
          <p className="text-xs text-muted-foreground">Sugerencias para mejorar tu tienda</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect?.(s.id)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors',
                toneClasses[s.tone],
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}