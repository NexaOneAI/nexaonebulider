import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Zap, Clock, Folder, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import { TemplateGallery } from '@/components/templates/TemplateGallery';

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const { profile } = useAuth();
  const { projects } = useProjects();
  const navigate = useNavigate();
  const [galleryOpen, setGalleryOpen] = useState(false);

  return (
    <AppShell>
      <div className="container py-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
          <h1 className="text-3xl font-bold">Hola, {profile?.full_name || 'Builder'} 👋</h1>
          <p className="mt-1 text-muted-foreground">Gestiona tus proyectos y créditos</p>
        </motion.div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Zap, label: 'Créditos', value: profile?.credits ?? 0, color: 'text-primary' },
            { icon: Folder, label: 'Proyectos', value: projects.length, color: 'text-accent' },
            { icon: Clock, label: 'Plan', value: (profile?.plan ?? 'free').toUpperCase(), color: 'text-success' },
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
            {projects.map((project) => (
              <div key={project.id}
                className="cursor-pointer rounded-xl border border-border/50 bg-card p-5 shadow-card transition-all hover:border-primary/30"
                onClick={() => navigate(`/builder/${project.id}`)}>
                <h3 className="font-semibold">{project.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{project.status}</p>
                <p className="mt-2 text-xs text-muted-foreground/70">{formatDate(project.updated_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
