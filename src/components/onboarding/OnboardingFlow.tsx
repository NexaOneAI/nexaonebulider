import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Gift, ArrowRight, ArrowLeft, Check, Rocket, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { onboardingService } from '@/features/onboarding/onboardingService';
import { TEMPLATES, type Template } from '@/features/templates/templates';
import { SUGGESTED_PROMPTS } from '@/features/onboarding/suggestedPrompts';
import { projectsService } from '@/features/projects/projectsService';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

type Step = 0 | 1 | 2;

export function OnboardingFlow({ open, onOpenChange, onCompleted }: Props) {
  const auth = useAuth();
  const user = auth?.user ?? null;
  const refreshProfile = auth?.refreshProfile ?? (async () => {});
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [grantingCredits, setGrantingCredits] = useState(false);
  const [creditsGranted, setCreditsGranted] = useState(false);
  const [creditsAmount, setCreditsAmount] = useState(25);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset when re-opened
  useEffect(() => {
    if (open) {
      setStep(0);
      setSelectedTemplate(null);
      setPrompt('');
    }
  }, [open]);

  // Step 0 — grant welcome credits as soon as the modal opens
  useEffect(() => {
    if (!open || !user?.id || creditsGranted || grantingCredits) return;
    setGrantingCredits(true);
    onboardingService
      .grantWelcomeCredits(user.id, 25)
      .then(async (r) => {
        if (r?.ok) {
          setCreditsGranted(true);
          if (!r.already) setCreditsAmount(25);
          try { await refreshProfile(); } catch (err) { console.warn('[Onboarding] refreshProfile failed:', err); }
        }
      })
      .catch((err) => console.warn('[Onboarding] grantWelcomeCredits failed:', err))
      .finally(() => setGrantingCredits(false));
  }, [open, user?.id, creditsGranted, grantingCredits, refreshProfile]);

  const persistStep = async (next: number) => {
    if (!user?.id) return;
    try { await onboardingService.setStep(user.id, next); }
    catch (err) { console.warn('[Onboarding] setStep failed:', err); }
  };

  const handleNext = async () => {
    const next = (step + 1) as Step;
    setStep(next);
    await persistStep(next);
  };

  const handleBack = () => {
    const prev = Math.max(0, step - 1) as Step;
    setStep(prev);
  };

  const handleSkip = async () => {
    if (user?.id) {
      try { await onboardingService.skip(user.id); }
      catch (err) { console.warn('[Onboarding] skip failed:', err); }
    }
    onOpenChange(false);
    onCompleted?.();
  };

  const handleFinish = async () => {
    if (!user?.id) return;
    if (!selectedTemplate && !prompt.trim()) {
      toast.error('Elige una plantilla o escribe qué quieres crear');
      return;
    }
    setCreating(true);
    try {
      const projectName = selectedTemplate?.name ?? 'Mi primera app';
      const project = await projectsService.create({
        user_id: user.id,
        name: projectName,
        description: selectedTemplate?.description ?? prompt.slice(0, 140),
      });
      if (!project) throw new Error('No se pudo crear el proyecto');

      // If a template was chosen, seed version 1 with its files (free).
      if (selectedTemplate) {
        await supabase.from('project_versions').insert({
          project_id: project.id,
          version_number: 1,
          prompt: `Plantilla inicial: ${selectedTemplate.name}`,
          model_used: 'template',
          generated_files: selectedTemplate.files as unknown as never,
          preview_code: selectedTemplate.previewCode,
        });
      }

      // Carry the seed prompt to the builder so it can auto-fill the chat.
      if (prompt.trim()) {
        sessionStorage.setItem(`seedPrompt:${project.id}`, prompt.trim());
      }

      await onboardingService.complete(user.id);
      onOpenChange(false);
      onCompleted?.();
      toast.success('¡Tu primer proyecto está listo! 🎉');
      navigate(`/builder/${project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el proyecto');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); else onOpenChange(true); }}>
      <DialogContent
        className="max-w-3xl gap-0 overflow-hidden border-border/60 p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header / progress */}
        <div className="relative border-b border-border/50 bg-gradient-to-br from-primary/10 via-background to-accent/5 px-6 py-5">
          <button
            onClick={handleSkip}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Cerrar onboarding"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            BIENVENIDA · PASO {step + 1} DE 3
          </div>
          <div className="mt-3 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= step ? 'bg-gradient-primary' : 'bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="min-h-[420px] px-6 py-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary glow-primary">
                  <Gift className="h-8 w-8 text-primary-foreground" />
                </div>
                <h2 className="mb-2 text-2xl font-bold md:text-3xl">
                  ¡Bienvenido a Nexa One! 🎉
                </h2>
                <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                  Construye apps completas en minutos con IA. Para que empieces sin fricción,
                  te regalamos créditos de bienvenida.
                </p>

                <div className="mx-auto mb-6 max-w-sm rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5">
                  {grantingCredits && !creditsGranted ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Acreditando…
                    </div>
                  ) : (
                    <>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Créditos de bienvenida
                      </p>
                      <p className="mt-1 text-4xl font-extrabold text-gradient">
                        +{creditsAmount}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Suficientes para generar 2-3 apps completas
                      </p>
                    </>
                  )}
                </div>

                <div className="mx-auto grid max-w-lg gap-3 text-left text-sm sm:grid-cols-3">
                  {[
                    { icon: '⚡', text: 'Genera con un prompt' },
                    { icon: '💬', text: 'Edita por chat' },
                    { icon: '🚀', text: 'Despliega o exporta' },
                  ].map((f) => (
                    <div
                      key={f.text}
                      className="rounded-lg border border-border/50 bg-card/50 p-3"
                    >
                      <div className="mb-1 text-lg">{f.icon}</div>
                      <div className="text-xs text-muted-foreground">{f.text}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6 text-center">
                  <h2 className="mb-2 text-2xl font-bold">Elige por dónde empezar</h2>
                  <p className="text-sm text-muted-foreground">
                    Selecciona una plantilla o salta este paso para empezar desde cero
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((t) => {
                    const active = selectedTemplate?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplate(active ? null : t)}
                        className={`group relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                          active
                            ? 'border-primary bg-primary/5 glow-primary'
                            : 'border-border/50 bg-card hover:border-primary/40'
                        }`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-xl">
                          {t.emoji}
                        </span>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold">{t.name}</h3>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {t.description}
                          </p>
                        </div>
                        {active && (
                          <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  💡 Las plantillas son gratis — no consumen créditos
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6 text-center">
                  <h2 className="mb-2 text-2xl font-bold">Tu primera generación</h2>
                  <p className="text-sm text-muted-foreground">
                    Describe qué quieres crear o elige una idea sugerida
                  </p>
                </div>

                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPrompt(s.prompt)}
                      className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-secondary/50"
                    >
                      <span className="text-base">{s.emoji}</span>
                      <span className="flex-1 truncate">{s.title}</span>
                    </button>
                  ))}
                </div>

                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: Una landing para mi cafetería con menú y reservaciones…"
                  rows={5}
                  className="resize-none"
                />

                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Rocket className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {selectedTemplate
                      ? `Empezarás con la plantilla "${selectedTemplate.name}". Tu prompt afinará el resultado.`
                      : 'Empezarás desde cero con tu prompt.'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 bg-card/30 px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Saltar
          </Button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack} disabled={creating}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Atrás
              </Button>
            )}
            {step < 2 ? (
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-gradient-primary hover:opacity-90"
              >
                Siguiente <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleFinish}
                disabled={creating || (!selectedTemplate && !prompt.trim())}
                className="bg-gradient-primary hover:opacity-90"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Creando…
                  </>
                ) : (
                  <>
                    Crear mi primera app <Sparkles className="ml-1 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}