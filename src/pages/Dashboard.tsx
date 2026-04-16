import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Plus, Zap, Clock, Folder, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [projects] = useState<{ id: string; name: string; status: string; updated: string }[]>([]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
          <h1 className="text-3xl font-bold">
            Hola, {profile?.full_name || 'Builder'} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Gestiona tus proyectos y créditos</p>
        </motion.div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Zap, label: 'Créditos', value: profile?.credits ?? 0, color: 'text-primary' },
            { icon: Folder, label: 'Proyectos', value: projects.length, color: 'text-accent' },
            { icon: Clock, label: 'Plan', value: profile?.plan?.toUpperCase() ?? 'FREE', color: 'text-success' },
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

        {/* Actions */}
        <div className="mb-8">
          <Button className="bg-gradient-primary hover:opacity-90" onClick={() => {
            const newId = crypto.randomUUID();
            navigate(`/builder/${newId}`);
          }}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo proyecto
          </Button>
        </div>

        {/* Projects */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Proyectos recientes</h2>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 bg-card/50 p-12 text-center">
              <Folder className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="mb-1 text-lg font-medium text-muted-foreground">Aún no tienes proyectos</p>
              <p className="mb-4 text-sm text-muted-foreground/70">Crea tu primera app con IA</p>
              <Button variant="outline" onClick={() => navigate(`/builder/${crypto.randomUUID()}`)}>
                Crear proyecto <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div key={project.id} className="cursor-pointer rounded-xl border border-border/50 bg-card p-5 shadow-card transition-all hover:border-primary/30"
                  onClick={() => navigate(`/builder/${project.id}`)}>
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{project.status}</p>
                  <p className="mt-2 text-xs text-muted-foreground/70">{project.updated}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
