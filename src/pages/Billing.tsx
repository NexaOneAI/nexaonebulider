import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { CREDIT_PACKAGES } from '@/lib/constants';
import { Zap, CreditCard, Clock, Loader2, ArrowDown, ArrowUp, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils';

interface CreditTransaction {
  id: string;
  type: 'debit' | 'credit' | 'refund';
  amount: number;
  reason: string;
  model: string | null;
  created_at: string;
}

export default function Billing() {
  const { profile, user, refreshProfile } = useAuth() as any;
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle MP redirect status
  useEffect(() => {
    const status = searchParams.get('status');
    if (!status) return;
    if (status === 'success') {
      toast.success('¡Pago aprobado! Los créditos se acreditarán en unos segundos.');
      refreshProfile?.();
    } else if (status === 'failure') {
      toast.error('El pago no se completó. Intenta de nuevo.');
    } else if (status === 'pending') {
      toast.info('Pago pendiente. Te avisaremos cuando se apruebe.');
    }
    // Clean URL
    searchParams.delete('status');
    searchParams.delete('purchase');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, refreshProfile]);

  useEffect(() => {
    if (user?.id) {
      setLoadingTx(true);
      supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => {
          setTransactions((data as CreditTransaction[]) || []);
          setLoadingTx(false);
        });
    }
  }, [user?.id]);

  const handlePurchase = async (pkg: typeof CREDIT_PACKAGES[number]) => {
    setPurchasing(pkg.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          packageId: pkg.id,
          packageName: pkg.name,
          credits: pkg.credits,
          amountMxn: pkg.price_mxn,
          returnUrl: `${window.location.origin}/billing`,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.checkoutUrl) throw new Error('No se recibió URL de pago');

      toast.info('Redirigiendo a Mercado Pago...');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar pago');
      setPurchasing(null);
    }
  };

  const txIcon = (type: string) => {
    if (type === 'credit') return <ArrowDown className="h-4 w-4 text-emerald-400" />;
    if (type === 'refund') return <RotateCcw className="h-4 w-4 text-amber-400" />;
    return <ArrowUp className="h-4 w-4 text-red-400" />;
  };

  const statusBanner = searchParams.get('status');

  return (
    <AppShell>
      <div className="container py-8">
        <h1 className="mb-2 text-3xl font-bold">Billing & Créditos</h1>
        <p className="mb-8 text-muted-foreground">Gestiona tu saldo y compra paquetes vía Mercado Pago</p>

        {statusBanner === 'success' && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <p className="text-sm">Pago aprobado. Tus créditos están en camino.</p>
          </div>
        )}
        {statusBanner === 'failure' && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <XCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm">El pago falló. Puedes intentarlo de nuevo.</p>
          </div>
        )}

        <div className="mb-8 flex items-center gap-4 rounded-xl border border-border/50 bg-card p-6 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo actual</p>
            <p className="text-3xl font-bold">{profile?.credits ?? 0} <span className="text-lg text-muted-foreground">créditos</span></p>
          </div>
          {profile?.is_unlimited && (
            <span className="ml-auto rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">Ilimitado</span>
          )}
        </div>

        <h2 className="mb-4 text-xl font-semibold">Paquetes de créditos</h2>
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <div key={pkg.id} className={`relative rounded-xl border p-6 shadow-card transition-all ${pkg.popular ? 'border-primary glow-primary' : 'border-border/50 bg-card'}`}>
              {pkg.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Popular</div>}
              <h3 className="text-lg font-bold">{pkg.name}</h3>
              <p className="mt-1 text-3xl font-extrabold text-gradient">{pkg.credits}</p>
              <p className="text-sm text-muted-foreground">créditos</p>
              <p className="mt-3 text-lg font-semibold">${pkg.price_mxn} MXN</p>
              <Button
                className={`mt-4 w-full ${pkg.popular ? 'bg-gradient-primary hover:opacity-90' : ''}`}
                variant={pkg.popular ? 'default' : 'outline'}
                disabled={purchasing !== null}
                onClick={() => handlePurchase(pkg)}
              >
                {purchasing === pkg.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Comprar
              </Button>
            </div>
          ))}
        </div>

        <h2 className="mb-4 text-xl font-semibold">Historial de transacciones</h2>
        {loadingTx ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay transacciones aún</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 border-b border-border/30 px-4 py-3 last:border-0">
                {txIcon(tx.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.reason}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'debit' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {tx.type === 'debit' ? '-' : '+'}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
