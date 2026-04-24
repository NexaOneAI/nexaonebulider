import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Zap, Clock, Folder, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import { safe } from '@/lib/utils';
import { TemplateGallery } from '@/components/templates/TemplateGallery';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { useOnboarding } from '@/hooks/useOnboarding';

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

type EstadoProyecto = {
  tipo?: 'landing' | 'saas' | 'dashboard' | 'marketplace' | 'pos';
  nombre?: string;
  archivos?: string[];
  rutas?: string[];
};

type SugerenciaUI = {
  titulo: string;
};

/**
 * Auto-detecta el tipo de proyecto a partir de su estado real:
 * - nombre
 * - archivos
 * - rutas
 * - palabras clave en cualquiera de los anteriores
 * Devuelve el tipo o 'unknown' si no hay señales suficientes.
 */
function detectarTipoProyecto(state: EstadoProyecto): EstadoProyecto['tipo'] | 'unknown' {
  const nombre = (state?.nombre ?? '').toLowerCase();
  const archivos = (state?.archivos ?? []).join(' ').toLowerCase();
  const rutas = (state?.rutas ?? []).join(' ').toLowerCase();
  const haystack = `${nombre} ${archivos} ${rutas}`;

  if (!haystack.trim()) return 'unknown';

  const has = (...words: string[]) => words.some((w) => haystack.includes(w));

  if (has('venta', 'pos', 'caja', 'tpv', 'punto de venta')) return 'pos';
  if (has('producto', 'catalogo', 'catálogo', 'marketplace', 'tienda', 'ecommerce', 'sellers', 'vendedor'))
    return 'marketplace';
  if (has('login', 'auth', 'workspace', 'tenant', 'subscription', 'suscripci', 'saas', 'plan', 'billing'))
    return 'saas';
  if (has('dashboard', 'kpi', 'analytics', 'chart', 'metric', 'panel'))
    return 'dashboard';
  if (has('landing', 'hero', 'pricing', 'cta', 'testimonial', 'lead'))
    return 'landing';

  return 'unknown';
}

function obtenerSugerencias(state: EstadoProyecto): SugerenciaUI[] {
  if (!state?.tipo) return [{ titulo: 'Analizar proyecto' }];

  if (state.tipo === 'landing') {
    return [
      { titulo: 'Agregar sección hero' },
      { titulo: 'Optimizar SEO' },
    ];
  }

  if (state.tipo === 'saas') {
    return [
      { titulo: 'Agregar login' },
      { titulo: 'Dashboard de usuario' },
    ];
  }

  if (state.tipo === 'dashboard') {
    return [
      { titulo: 'Agregar métricas KPI' },
      { titulo: 'Mostrar gráficos' },
    ];
  }

  if (state.tipo === 'marketplace') {
    return [
      { titulo: 'Agregar catálogo' },
      { titulo: 'Activar checkout' },
    ];
  }

  if (state.tipo === 'pos') {
    return [
      { titulo: 'Mejorar carrito' },
      { titulo: 'Control de inventario' },
    ];
  }

  return [{ titulo: 'Analizar proyecto' }];
}

// Proyectos demo para probar la auto-detección sin tener que crear un proyecto real.
// Cada uno aporta nombre + archivos + rutas distintos. El tipo NO se setea a mano:
// detectarTipoProyecto() lo infiere.
const PROYECTOS_DEMO: { id: string; etiqueta: string; estado: EstadoProyecto }[] = [
  {
    id: 'demo-landing',
    etiqueta: 'Demo: Landing',
    estado: {
      nombre: 'Mi Landing Startup',
      archivos: ['src/pages/Index.tsx', 'src/components/Hero.tsx', 'src/components/Pricing.tsx'],
      rutas: ['/'],
    },
  },
  {
    id: 'demo-saas',
    etiqueta: 'Demo: SaaS',
    estado: {
      nombre: 'Mi SaaS Workspace',
      archivos: ['src/pages/Login.tsx', 'src/pages/Billing.tsx', 'src/features/workspace/ws.ts'],
      rutas: ['/login', '/dashboard', '/billing'],
    },
  },
  {
    id: 'demo-pos',
    etiqueta: 'Demo: POS',
    estado: {
      nombre: 'POS Tienda',
      archivos: ['src/pages/Pos.tsx', 'src/components/Cart.tsx'],
      rutas: ['/pos', '/ventas'],
    },
  },
  {
    id: 'demo-marketplace',
    etiqueta: 'Demo: Marketplace',
    estado: {
      nombre: 'Marketplace de Vendedores',
      archivos: ['src/pages/Productos.tsx', 'src/features/sellers/seller.ts'],
      rutas: ['/productos', '/vendedores'],
    },
  },
  {
    id: 'demo-dashboard',
    etiqueta: 'Demo: Dashboard',
    estado: {
      nombre: 'Panel de Analytics',
      archivos: ['src/pages/Dashboard.tsx', 'src/components/Chart.tsx'],
      rutas: ['/dashboard', '/metrics'],
    },
  },
];

export default function Dashboard() {
  const auth = useAuth();
  const projectsHook = useProjects();
  const profile = auth?.profile ?? null;
  const projects = Array.isArray(projectsHook?.projects) ? projectsHook.projects : [];
  const navigate = useNavigate();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [proyectoActivoId, setProyectoActivoId] = useState<string>('demo-landing');
  const [override, setOverride] = useState<EstadoProyecto['tipo'] | null>(null);
  const [sugerencias, setSugerencias] = useState<SugerenciaUI[]>([]);
  const onboarding = useOnboarding();
  const onboardingOpen = !!onboarding?.open;
  const setOnboardingOpen = onboarding?.setOpen ?? (() => {});
  const reopen = onboarding?.reopen ?? (() => {});
  const refresh = onboarding?.refresh ?? (async () => {});

  const fullName = safe<string>(profile, 'full_name', '') || 'Builder';
  const credits = safe<number>(profile, 'credits', 0) ?? 0;
  const plan = (safe<string>(profile, 'plan', 'free') ?? 'free').toUpperCase();

  // Estado base del proyecto activo (lo que vendría del backend al abrir un
  // proyecto real). El tipo NO viene en este objeto: lo derivamos.
  const estadoBase = useMemo<EstadoProyecto>(() => {
    const found = PROYECTOS_DEMO.find((p) => p.id === proyectoActivoId);
    return found?.estado ?? {};
  }, [proyectoActivoId]);

  // Detección automática — sin clicks. Cambia con cualquier cambio en estadoBase.
  const tipoDetectado = useMemo(() => detectarTipoProyecto(estadoBase), [estadoBase]);

  // El override manual solo sirve si el usuario lo pidió explícito.
  const tipoEfectivo = override ?? tipoDetectado;

  // projectState ya combinado, listo para recalcular sugerencias.
  const projectState = useMemo<EstadoProyecto>(
    () => ({ ...estadoBase, tipo: tipoEfectivo === 'unknown' ? undefined : tipoEfectivo }),
    [estadoBase, tipoEfectivo],
  );

  // Si cambia el proyecto activo, descarto el override (vuelve a auto).
  useEffect(() => {
    setOverride(null);
  }, [proyectoActivoId]);

  useEffect(() => {
    const nuevas = obtenerSugerencias(projectState);
    setSugerencias(nuevas);
  }, [projectState]);

  return (
    <AppShell>
      <div className="container py-4 sm:py-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Hola, {fullName} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Gestiona tus proyectos y créditos</p>
        </motion.div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4 md:mb-8">
          {[
            { icon: Zap, label: 'Créditos', value: credits, color: 'text-primary' },
            { icon: Folder, label: 'Proyectos', value: projects.length, color: 'text-accent' },
            { icon: Clock, label: 'Plan', value: plan, color: 'text-success' },
          ].map((stat, i) => (
            <motion.div key={i} initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border/50 bg-card p-3 shadow-card sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary sm:h-10 sm:w-10">
                  <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                  <p className="truncate text-base font-bold sm:text-xl">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <Button className="bg-gradient-primary hover:opacity-90" onClick={() => setGalleryOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" /> Nuevo proyecto
          </Button>
          <Button variant="outline" onClick={reopen}>
            <HelpCircle className="mr-2 h-4 w-4" /> Ver tour inicial
          </Button>
        </div>

        <div className="mb-8 rounded-xl border border-border/50 bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Sugerencias dinámicas</h2>
              <p className="text-sm text-muted-foreground">
                El tipo se detecta solo desde nombre, archivos y rutas. Cambia
                de proyecto y las sugerencias cambian sin hacer click.
              </p>
            </div>
            <div className="text-right">
              <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Detectado: {tipoDetectado}
              </div>
              {override && (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  override manual: {override}{' '}
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => setOverride(null)}
                  >
                    quitar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Selector de proyecto activo (simula cambiar de proyecto en el dashboard).
              No selecciona el TIPO: solo cambia los inputs (nombre/archivos/rutas)
              y la detección automática hace el resto. */}
          <div className="mb-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Proyecto activo
            </p>
            <div className="flex flex-wrap gap-2">
              {PROYECTOS_DEMO.map((p) => (
                <Button
                  key={p.id}
                  variant={p.id === proyectoActivoId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProyectoActivoId(p.id)}
                >
                  {p.etiqueta}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 p-3 text-xs">
            <div className="text-muted-foreground">
              <span className="font-semibold text-foreground">Nombre:</span> {estadoBase.nombre}
            </div>
            <div className="mt-1 text-muted-foreground">
              <span className="font-semibold text-foreground">Archivos:</span>{' '}
              {(estadoBase.archivos ?? []).join(', ')}
            </div>
            <div className="mt-1 text-muted-foreground">
              <span className="font-semibold text-foreground">Rutas:</span>{' '}
              {(estadoBase.rutas ?? []).join(', ')}
            </div>
          </div>

          {/* Override manual opcional — solo si el usuario quiere forzar otro tipo. */}
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Override manual (opcional)
            </p>
            <div className="flex flex-wrap gap-2">
              {(['landing', 'saas', 'dashboard', 'marketplace', 'pos'] as const).map((t) => (
                <Button
                  key={t}
                  variant={override === t ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setOverride(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {sugerencias.map((s, i) => (
              <div key={`${s.titulo}-${i}`} className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
                {s.titulo}
              </div>
            ))}
          </div>
        </div>

        <h2 className="mb-4 text-xl font-semibold">Proyectos recientes</h2>
        {projects.length === 0 ? (
          <EmptyState
            icon={<Folder className="h-10 w-10" />}
            title="Aún no tienes proyectos"
            description="Empieza con una plantilla o desde cero"
            action={
              <Button variant="outline" onClick={() => setGalleryOpen(true)}>
                Elegir plantilla <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const id = safe<string>(project, 'id', '') ?? '';
              if (!id) {
                // Defensive: skip malformed rows instead of rendering an
                // unclickable card with a random key (caused React reconciler
                // churn on every refresh).
                return null;
              }
              const name = safe<string>(project, 'name', 'Sin título') ?? 'Sin título';
              const status = safe<string>(project, 'status', 'draft') ?? 'draft';
              const updatedAt = safe<string>(project, 'updated_at', '');
              return (
              <div key={id}
                className="cursor-pointer rounded-xl border border-border/50 bg-card p-5 shadow-card transition-all hover:border-primary/30"
                onClick={() => navigate(`/builder/${id}`)}>
                <h3 className="font-semibold">{name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{status}</p>
                {updatedAt && (
                  <p className="mt-2 text-xs text-muted-foreground/70">{formatDate(updatedAt)}</p>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
      <TemplateGallery open={galleryOpen} onOpenChange={setGalleryOpen} />
      <OnboardingFlow
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onCompleted={refresh}
      />
    </AppShell>
  );
}
