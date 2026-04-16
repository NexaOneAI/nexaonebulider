import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Zap, Code2, Layers, Rocket, ArrowRight, Sparkles, Globe, Download, Share2, MessageCircle, Music2 } from 'lucide-react';

const PROMO_VIDEO = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663519690978/YThcwHUIkZPggRHo.mp4';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (isAuthenticated) navigate('/dashboard'); }, [isAuthenticated, navigate]);

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,hsl(200_90%_48%/0.12),transparent_70%)]" />
        <div className="container relative py-24 md:py-36">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-Powered App Builder
            </div>
            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Crea apps completas con{' '}
              <span className="text-gradient">inteligencia artificial</span>
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
              Escribe un prompt, genera tu aplicación, edítala por chat, previsualízala en vivo, expórtala y despliégala. Todo desde un solo lugar.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="bg-gradient-primary px-8 hover:opacity-90" onClick={() => navigate('/register')}>
                Empezar gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>Ya tengo cuenta</Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video promocional */}
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl"
          >
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-4 py-1.5 text-sm font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Mira Nexa One en acción
              </div>
              <h2 className="text-3xl font-bold md:text-4xl">
                Tu idea, hecha realidad <span className="text-gradient">con IA</span>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Describe lo que quieres construir y nuestra IA lo convierte en una app funcional en segundos.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-black shadow-elevated glow-primary">
              <video
                controls
                autoPlay
                muted
                playsInline
                loop
                className="block w-full"
                src={PROMO_VIDEO}
              >
                Tu navegador no soporta video HTML5.
              </video>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="bg-gradient-primary hover:opacity-90">
                <a href={PROMO_VIDEO} download="nexa-one-promo.mp4">
                  <Download className="mr-2 h-4 w-4" /> Descargar video
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Share2 className="mr-2 h-4 w-4" /> Facebook
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent('Mira Nexa One Builder, la IA que crea apps en segundos: ' + window.location.origin)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="https://www.tiktok.com/upload" target="_blank" rel="noopener noreferrer">
                  <Music2 className="mr-2 h-4 w-4" /> Subir a TikTok
                </a>
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              💡 Para TikTok: descarga el video primero y luego súbelo desde la app.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-border/50 py-20">
        <div className="container">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="mb-12 text-center text-3xl font-bold">Todo lo que necesitas para crear</motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Code2, title: 'Generación con IA', desc: 'Escribe lo que quieres y la IA genera el código completo de tu aplicación.' },
              { icon: Layers, title: 'Edición por chat', desc: 'Modifica tu app conversando. Sin regenerar todo desde cero.' },
              { icon: Globe, title: 'Preview en vivo', desc: 'Ve los cambios al instante en desktop, tablet y móvil.' },
              { icon: Download, title: 'Exportar ZIP', desc: 'Descarga tu proyecto completo listo para producción.' },
              { icon: Rocket, title: 'Deploy directo', desc: 'Despliega a Netlify con un solo clic.' },
              { icon: Zap, title: 'Multi-modelo IA', desc: 'Elige entre OpenAI, Claude, Gemini o tu propio provider.' },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} transition={{ delay: i * 0.1 }}
                className="group rounded-xl border border-border/50 bg-card p-6 shadow-card transition-all hover:border-primary/30 hover:glow-primary">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                  <item.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/50 py-20">
        <div className="container">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="mb-12 text-center text-3xl font-bold">¿Cómo funciona?</motion.h2>
          <div className="mx-auto grid max-w-2xl gap-8">
            {[
              { step: '01', title: 'Describe tu app', desc: 'Escribe un prompt describiendo lo que quieres crear.' },
              { step: '02', title: 'La IA genera', desc: 'El modelo procesa tu solicitud y crea todos los archivos.' },
              { step: '03', title: 'Edita y ajusta', desc: 'Chatea con la IA para refinar cada detalle.' },
              { step: '04', title: 'Exporta o despliega', desc: 'Descarga el ZIP o despliega directamente.' },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} transition={{ delay: i * 0.1 }} className="flex gap-6">
                <span className="text-3xl font-extrabold text-gradient">{item.step}</span>
                <div>
                  <h3 className="mb-1 text-lg font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border/50 py-20">
        <div className="container">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="mb-4 text-center text-3xl font-bold">Planes y créditos</motion.h2>
          <p className="mb-12 text-center text-muted-foreground">Paga solo por lo que usas</p>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-4">
            {[
              { name: 'Starter', credits: 50, price: '$99 MXN', popular: false },
              { name: 'Builder', credits: 150, price: '$249 MXN', popular: true },
              { name: 'Pro', credits: 500, price: '$699 MXN', popular: false },
              { name: 'Enterprise', credits: 2000, price: '$2,499 MXN', popular: false },
            ].map((plan, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} transition={{ delay: i * 0.1 }}
                className={`relative rounded-xl border p-6 text-center shadow-card transition-all ${plan.popular ? 'border-primary glow-primary' : 'border-border/50 bg-card'}`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Popular</div>}
                <h3 className="mb-1 text-lg font-bold">{plan.name}</h3>
                <p className="mb-4 text-2xl font-extrabold text-gradient">{plan.credits}</p>
                <p className="mb-1 text-sm text-muted-foreground">créditos</p>
                <p className="mb-6 text-lg font-semibold">{plan.price}</p>
                <Button className={plan.popular ? 'w-full bg-gradient-primary hover:opacity-90' : 'w-full'} variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => navigate('/register')}>Comprar</Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 py-20">
        <div className="container text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h2 className="mb-4 text-3xl font-bold">¿Listo para crear tu próxima app?</h2>
            <p className="mb-8 text-muted-foreground">Únete a Nexa One y empieza a construir con IA hoy.</p>
            <Button size="lg" className="bg-gradient-primary px-10 hover:opacity-90" onClick={() => navigate('/register')}>
              Crear cuenta gratis <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span>Nexa One Builder</span>
          </div>
          <p>© 2026. Todos los derechos reservados.</p>
        </div>
      </footer>
    </AppShell>
  );
}
