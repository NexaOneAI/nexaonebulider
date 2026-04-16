import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { CREDIT_PACKAGES } from '@/types';
import { Zap, CreditCard, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function Billing() {
  const { profile } = useAuthStore();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <h1 className="mb-2 text-3xl font-bold">Billing & Créditos</h1>
        <p className="mb-8 text-muted-foreground">Gestiona tu saldo y compra paquetes</p>

        {/* Current balance */}
        <div className="mb-8 flex items-center gap-4 rounded-xl border border-border/50 bg-card p-6 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo actual</p>
            <p className="text-3xl font-bold">{profile?.credits ?? 0} <span className="text-lg text-muted-foreground">créditos</span></p>
          </div>
        </div>

        {/* Packages */}
        <h2 className="mb-4 text-xl font-semibold">Paquetes de créditos</h2>
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <div key={pkg.id} className={`relative rounded-xl border p-6 shadow-card transition-all ${pkg.popular ? 'border-primary glow-primary' : 'border-border/50 bg-card'}`}>
              {pkg.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Popular</div>}
              <h3 className="text-lg font-bold">{pkg.name}</h3>
              <p className="mt-1 text-3xl font-extrabold text-gradient">{pkg.credits}</p>
              <p className="text-sm text-muted-foreground">créditos</p>
              <p className="mt-3 text-lg font-semibold">${pkg.price_mxn} MXN</p>
              <Button className={`mt-4 w-full ${pkg.popular ? 'bg-gradient-primary hover:opacity-90' : ''}`}
                variant={pkg.popular ? 'default' : 'outline'}
                onClick={() => toast.info('Integración de pagos próximamente')}>
                <CreditCard className="mr-2 h-4 w-4" /> Comprar
              </Button>
            </div>
          ))}
        </div>

        {/* Transaction history */}
        <h2 className="mb-4 text-xl font-semibold">Historial de transacciones</h2>
        <div className="rounded-xl border border-dashed border-border/50 bg-card/50 p-12 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-muted-foreground">No hay transacciones aún</p>
        </div>
      </div>
    </div>
  );
}
