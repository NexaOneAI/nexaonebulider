import { useEffect, useState } from 'react';
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
};

type SugerenciaUI = {
  titulo: string;
};

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

export default function Dashboard() {
  const auth = useAuth();
  const projectsHook = useProjects();
  const profile = auth?.profile ?? null;
  const projects = Array.isArray(projectsHook?.projects) ? projectsHook.projects : [];
  const navigate = useNavigate();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [projectState, setProjectState] = useState<EstadoProyecto>({});
  const [sugerencias, setSugerencias] = useState<SugerenciaUI[]>([]);
  const onboarding = useOnboarding();
  const onboardingOpen = !!onboarding?.open;
  const setOnboardingOpen = onboarding?.setOpen ?? (() => {});
  const reopen = onboarding?.reopen ?? (() => {});
  const refresh = onboarding?.refresh ?? (async () => {});

  const fullName = safe<string>(profile, 'full_name', '') || 'Builder';
  const credits = safe<number>(profile, 'credits', 0) ?? 0;
  const plan = (safe<string>(profile, 'plan', 'free') ?? 'free').toUpperCase();

  useEffect(() => {
    const nuevas = obtenerSugerencias(projectState);
    setSugerencias(nuevas);
  }, [projectState]);

  return (
    <AppShell>
      <div className="container py-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
          <h1 className="text-3xl font-bold">Hola, {fullName} 👋</h1>
          <p className="mt-1 text-muted-foreground">Gestiona tus proyectos y créditos</p>
        </motion.div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Zap, label: 'Créditos', value: credits, color: 'text-primary' },
            { icon: Folder, label: 'Proyectos', value: projects.length, color: 'text-accent' },
            { icon: Clock, label: 'Plan', value: plan, color: 'text-success' },
          ].map((stat, i) => (
            <motion.div key={i} initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border/50 bg-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
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
                Haz click en los botones y las sugerencias cambian en tiempo real.
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-1 text-xs font-medium">
              {projectState.tipo ? `Tipo activo: ${projectState.tipo}` : 'Tipo activo: ninguno'}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setProjectState({ tipo: 'landing' })}>
              Landing
            </Button>
            <Button variant="outline" size="sm" onClick={() => setProjectState({ tipo: 'saas' })}>
              SaaS
            </Button>
            <Button variant="outline" size="sm" onClick={() => setProjectState({ tipo: 'dashboard' })}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => setProjectState({ tipo: 'marketplace' })}>
              Marketplace
            </Button>
            <Button variant="outline" size="sm" onClick={() => setProjectState({ tipo: 'pos' })}>
              POS
            </Button>
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
