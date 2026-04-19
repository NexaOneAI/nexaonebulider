import { AppShell } from '@/components/layout/AppShell';
import { CONNECTORS } from '@/features/connectors/connectorsRegistry';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plug } from 'lucide-react';

const CATEGORY_LABEL: Record<string, string> = {
  payments: 'Pagos',
  email: 'Email',
  ai: 'IA',
  messaging: 'Mensajería',
  storage: 'Storage / Deploy',
};

export default function Connectors() {
  const grouped = CONNECTORS.reduce<Record<string, typeof CONNECTORS>>((acc, c) => {
    acc[c.category] = acc[c.category] || [];
    acc[c.category].push(c);
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Plug className="h-6 w-6 text-primary" /> Connectors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conecta servicios externos a tus apps. Las claves se guardan como secretos en
            Lovable Cloud y solo son accesibles desde edge functions.
          </p>
        </header>

        {Object.entries(grouped).map(([cat, items]) => (
          <section key={cat}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABEL[cat] ?? cat}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => {
                const Icon = c.icon;
                return (
                  <Card key={c.id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold">{c.name}</h3>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {c.secretNames.map((s) => (
                        <Badge key={s} variant="outline" className="font-mono text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>

                    {c.docsUrl && (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="mt-auto h-7 justify-start px-0 text-xs text-primary"
                      >
                        <a href={c.docsUrl} target="_blank" rel="noreferrer">
                          Obtener API key <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}

        <Card className="border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium">¿Cómo añadir las API keys?</p>
          <p className="mt-1 text-muted-foreground">
            Pídele al chat algo como <em>"conecta Stripe"</em> o <em>"añade Resend"</em>.
            El builder te pedirá las claves de forma segura y las guardará como secretos
            del backend, listas para usar en edge functions.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
