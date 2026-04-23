import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ArrowRight, Folder } from 'lucide-react';

export default function ProjectDetail() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? '';
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="container py-8">
        <h1 className="mb-2 text-3xl font-bold">Detalle del proyecto</h1>
        <p className="mb-8 text-muted-foreground font-mono text-sm">
          {projectId || 'Sin ID'}
        </p>

        <div className="rounded-xl border border-border/50 bg-card p-8 shadow-card text-center">
          <Folder className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-4">Proyecto conectado al builder</p>
          <Button
            className="bg-gradient-primary hover:opacity-90"
            disabled={!projectId}
            onClick={() => projectId && navigate(`/builder/${projectId}`)}
          >
            Abrir en Builder <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
