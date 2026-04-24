import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import {
  getQuickActions,
  type QuickAction,
} from '@/features/builder/suggestions/contextualActions';
import type { GeneratedFile } from '@/features/projects/projectTypes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Public, no-auth demo that proves dynamic suggestions work end-to-end in
 * the real UI. Switching the active fixture re-runs `getQuickActions` via
 * `useEffect([projectState])` and the visible action chips change live.
 * Open at /suggestions-demo.
 */

type Fixture = {
  id: 'landing' | 'pos' | 'saas' | 'marketplace' | 'dashboard';
  label: string;
  projectName: string;
  description: string;
  files: GeneratedFile[];
  lastUserPrompt: string;
};

const mk = (path: string, content = ''): GeneratedFile => ({
  path,
  content,
  language: path.endsWith('.tsx') ? 'tsx' : path.endsWith('.ts') ? 'ts' : 'text',
});

const FIXTURES: Fixture[] = [
  {
    id: 'landing',
    label: 'Landing Page',
    projectName: 'Mi Landing Startup',
    description: 'Sitio promocional con hero, pricing y testimonios.',
    files: [
      mk('src/pages/Index.tsx', 'hero pricing testimonials cta lead magnet'),
      mk('src/components/Hero.tsx', 'hero section'),
      mk('src/components/Pricing.tsx', 'pricing plans'),
    ],
    lastUserPrompt: 'crea una landing con hero, pricing y testimonios',
  },
  {
    id: 'pos',
    label: 'POS / Punto de venta',
    projectName: 'POS Tienda',
    description: 'Caja registradora con carrito e inventario.',
    files: [
      mk('src/pages/Pos.tsx', 'punto de venta carrito checkout caja venta'),
      mk('src/components/Cart.tsx', 'carrito addtocart checkout'),
    ],
    lastUserPrompt: 'agrega carrito al punto de venta',
  },
  {
    id: 'saas',
    label: 'SaaS multi-tenant',
    projectName: 'Mi SaaS Workspace',
    description: 'Workspaces, suscripciones y planes.',
    files: [
      mk('src/pages/Dashboard.tsx', 'saas workspace tenants subscription plan multi-tenant'),
      mk('src/features/workspace/ws.ts', 'workspace tenants suscripcion'),
      mk('src/pages/Billing.tsx', 'subscription plan billing'),
    ],
    lastUserPrompt: 'es un saas multi-tenant con suscripciones',
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    projectName: 'Marketplace de Vendedores',
    description: 'Catálogo, vendedores y pagos.',
    files: [
      mk('src/pages/Index.tsx', 'marketplace listings sellers vendedores catalogo producto tienda'),
      mk('src/features/sellers/seller.ts', 'sellers vendedores'),
    ],
    lastUserPrompt: 'marketplace de vendedores con catalogo',
  },
  {
    id: 'dashboard',
    label: 'Dashboard analytics',
    projectName: 'Panel de Analytics',
    description: 'KPIs, métricas y gráficos.',
    files: [
      mk('src/pages/Dashboard.tsx', 'dashboard analytics kpi charts metricas panel'),
      mk('src/components/Chart.tsx', 'recharts chart kpi'),
    ],
    lastUserPrompt: 'dashboard con kpis y graficos',
  },
];

const TONE_CLASSES: Record<string, string> = {
  primary: 'bg-primary/10 text-primary border-primary/30',
  accent: 'bg-accent/10 text-accent border-accent/30',
  muted: 'bg-muted/40 text-foreground border-border',
};

export default function SuggestionsDemo() {
  const [activeId, setActiveId] = useState<Fixture['id']>('landing');
  const [suggestions, setSuggestions] = useState<QuickAction[]>([]);
  const [detectedKind, setDetectedKind] = useState<string>('unknown');
  const [recomputeCount, setRecomputeCount] = useState(0);

  const active = FIXTURES.find((f) => f.id === activeId) ?? FIXTURES[0];

  // The whole point of this page: show that suggestions react to project
  // state changes via the canonical useEffect([state]) → setState pattern.
  useEffect(() => {
    const result = getQuickActions(active.projectName, active.files, {
      lastUserPrompt: active.lastUserPrompt,
    });
    setDetectedKind(result.kind);
    setSuggestions(result.actions);
    setRecomputeCount((n) => n + 1);
  }, [active]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Demo pública del motor de sugerencias dinámicas
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold">Sugerencias dinámicas — prueba en vivo</h1>
        <p className="mt-2 text-muted-foreground">
          Cambia entre proyectos. Las sugerencias se recalculan automáticamente
          vía <code className="rounded bg-muted px-1.5 py-0.5 text-xs">useEffect([projectState])</code>{' '}
          y se renderizan al instante. Sin login. Sin mocks. UI real.
        </p>

        <section className="mt-8">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            1. Elige un proyecto
          </div>
          <div className="flex flex-wrap gap-2">
            {FIXTURES.map((f) => (
              <Button
                key={f.id}
                variant={f.id === activeId ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveId(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              projectState (input)
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{active.projectName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{active.description}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Archivos ({active.files.length})</dt>
                <dd className="mt-1 space-y-0.5">
                  {active.files.map((f) => (
                    <code
                      key={f.path}
                      className="block rounded bg-muted px-2 py-0.5 text-xs"
                    >
                      {f.path}
                    </code>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Último prompt</dt>
                <dd className="italic">"{active.lastUserPrompt}"</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resultado (output)
              </div>
              <div className="text-[10px] text-muted-foreground">
                recomputes: {recomputeCount}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tipo detectado:</span>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                {detectedKind}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {suggestions.length} sugerencias
              </span>
            </div>

            {suggestions.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Sin sugerencias para este estado.
              </p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
                      TONE_CLASSES[s.tone ?? 'muted'],
                    )}
                    title={s.prompt || s.label}
                  >
                    {s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-border/60 bg-card/30 p-5 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">¿Cómo validar?</strong> Haz click en
            cada botón de proyecto arriba. La etiqueta "Tipo detectado" cambia
            (<code>landing</code> → <code>pos</code> → <code>saas</code> → …) y la lista de
            chips de sugerencias se reemplaza completamente. El contador{' '}
            <code>recomputes</code> sube en cada cambio = prueba de que el{' '}
            <code>useEffect</code> se está disparando con la nueva dependencia.
          </p>
        </section>
      </main>
    </div>
  );
}