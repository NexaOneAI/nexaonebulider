import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Shield, Users, CreditCard, Folder, Activity } from 'lucide-react';

export default function Admin() {
  const tabs = [
    { icon: Users, label: 'Usuarios', count: 0 },
    { icon: CreditCard, label: 'Créditos', count: 0 },
    { icon: Folder, label: 'Proyectos', count: 0 },
    { icon: Activity, label: 'Logs', count: 0 },
  ];

  return (
    <AppShell>
      <div className="container py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Gestión de plataforma</p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          {tabs.map((tab, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <tab.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{tab.label}</p>
                  <p className="text-2xl font-bold">{tab.count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <EmptyState
          icon={<Shield className="h-10 w-10" />}
          title="Panel de administración"
          description="Conecta la base de datos para ver usuarios, créditos y proyectos"
        />
      </div>
    </AppShell>
  );
}
