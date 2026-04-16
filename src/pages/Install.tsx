import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Smartphone, Apple, Monitor, Share, PlusSquare, MoreVertical,
  Download, CheckCircle2, Zap, ArrowLeft, Wifi, Bell, Home,
} from 'lucide-react';

// BeforeInstallPromptEvent is non-standard; type it loosely.
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function detectDefaultTab(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

export default function Install() {
  const [defaultTab] = useState<'ios' | 'android' | 'desktop'>(detectDefaultTab);
  const [deferredPrompt, setDeferredPrompt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed (running as standalone)
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari standalone flag
      // @ts-expect-error - non-standard
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,hsl(200_90%_48%/0.08),transparent_70%)]" />

      <div className="container relative mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>

        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary glow-primary">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Instala Nexa One Builder</h1>
          <p className="mt-2 text-muted-foreground">
            Añádelo a tu pantalla de inicio para acceso rápido, modo offline y experiencia tipo app nativa.
          </p>
        </header>

        {installed && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">¡Ya tienes la app instalada!</p>
              <p className="text-sm text-muted-foreground">
                Estás corriendo Nexa One en modo standalone. Puedes lanzarla desde tu pantalla de inicio.
              </p>
            </div>
          </div>
        )}

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <Benefit icon={Wifi} title="Funciona offline" desc="Acceso sin conexión" />
          <Benefit icon={Home} title="Pantalla de inicio" desc="Como una app nativa" />
          <Benefit icon={Bell} title="Más rápido" desc="Carga instantánea" />
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ios"><Apple className="mr-2 h-4 w-4" /> iOS</TabsTrigger>
            <TabsTrigger value="android"><Smartphone className="mr-2 h-4 w-4" /> Android</TabsTrigger>
            <TabsTrigger value="desktop"><Monitor className="mr-2 h-4 w-4" /> Desktop</TabsTrigger>
          </TabsList>

          {/* iOS */}
          <TabsContent value="ios" className="mt-6 rounded-xl border border-border/50 bg-card p-6 shadow-card">
            <h2 className="mb-1 text-xl font-semibold">iPhone / iPad (Safari)</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              En iOS la instalación se hace desde Safari. Chrome y Firefox para iOS no soportan esta función.
            </p>
            <Steps
              steps={[
                { icon: Apple, text: <>Abre <strong>Safari</strong> y ve a esta página.</> },
                { icon: Share, text: <>Toca el botón <strong>Compartir</strong> <span className="text-muted-foreground">(cuadrado con flecha hacia arriba)</span> en la barra inferior.</> },
                { icon: PlusSquare, text: <>Desplázate y selecciona <strong>"Añadir a pantalla de inicio"</strong>.</> },
                { icon: CheckCircle2, text: <>Confirma con <strong>"Añadir"</strong>. El icono aparecerá en tu pantalla.</> },
              ]}
            />
            <Note>
              Una vez instalada, ábrela desde el icono de inicio para usar la pantalla completa y modo offline.
            </Note>
          </TabsContent>

          {/* Android */}
          <TabsContent value="android" className="mt-6 rounded-xl border border-border/50 bg-card p-6 shadow-card">
            <h2 className="mb-1 text-xl font-semibold">Android (Chrome / Edge / Samsung Internet)</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              La mayoría de navegadores Android muestran una sugerencia automática para instalar.
            </p>

            {deferredPrompt && (
              <div className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="mb-3 text-sm">
                  Tu navegador permite instalar con un solo clic:
                </p>
                <Button onClick={handleInstall} className="bg-gradient-primary hover:opacity-90">
                  <Download className="mr-2 h-4 w-4" /> Instalar ahora
                </Button>
              </div>
            )}

            <Steps
              steps={[
                { icon: Smartphone, text: <>Abre la app en <strong>Chrome</strong>, Edge o Samsung Internet.</> },
                { icon: MoreVertical, text: <>Toca el menú <strong>⋮</strong> en la esquina superior derecha.</> },
                { icon: Download, text: <>Selecciona <strong>"Instalar app"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</> },
                { icon: CheckCircle2, text: <>Confirma e Nexa One quedará instalada como app.</> },
              ]}
            />
            <Note>
              Si no ves la opción "Instalar app", recarga la página. Algunos navegadores requieren visitar el sitio varias veces antes de mostrarla.
            </Note>
          </TabsContent>

          {/* Desktop */}
          <TabsContent value="desktop" className="mt-6 rounded-xl border border-border/50 bg-card p-6 shadow-card">
            <h2 className="mb-1 text-xl font-semibold">Windows / macOS / Linux</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Compatible con Chrome, Edge, Brave y Arc. Safari en Mac no soporta instalación PWA.
            </p>

            {deferredPrompt && (
              <div className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="mb-3 text-sm">
                  Tu navegador permite instalar con un solo clic:
                </p>
                <Button onClick={handleInstall} className="bg-gradient-primary hover:opacity-90">
                  <Download className="mr-2 h-4 w-4" /> Instalar ahora
                </Button>
              </div>
            )}

            <Steps
              steps={[
                { icon: Monitor, text: <>Abre la app en <strong>Chrome, Edge o Brave</strong>.</> },
                { icon: Download, text: <>Busca el icono de <strong>instalación</strong> en la barra de direcciones (a la derecha de la URL).</> },
                { icon: PlusSquare, text: <>O abre el menú <strong>⋮</strong> → <strong>"Instalar Nexa One Builder"</strong>.</> },
                { icon: CheckCircle2, text: <>La app se abrirá en una ventana propia y aparecerá en tus aplicaciones.</> },
              ]}
            />
            <Note>
              En macOS, la app instalada aparece en Launchpad. En Windows, en el menú Inicio. Puedes anclarla a la barra de tareas o Dock.
            </Note>
          </TabsContent>
        </Tabs>

        <div className="mt-10 text-center">
          <p className="mb-3 text-sm text-muted-foreground">¿Problemas para instalar?</p>
          <Button asChild variant="outline">
            <Link to="/dashboard">Continuar en el navegador</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Benefit({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Steps({ steps }: { steps: { icon: React.ComponentType<{ className?: string }>; text: React.ReactNode }[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {i + 1}
          </div>
          <div className="flex flex-1 items-start gap-2 pt-1">
            <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
      💡 {children}
    </p>
  );
}
