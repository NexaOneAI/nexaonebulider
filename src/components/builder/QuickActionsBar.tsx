import { useMemo, useState } from 'react';
import {
  Sparkles,
  Shield,
  Database,
  Smartphone,
  Rocket,
  GitBranch,
  LayoutDashboard,
  Search,
  Image as ImageIcon,
  BarChart3,
  ShoppingCart,
  Package,
  History,
  Users,
  CreditCard,
  Palette,
  Zap,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBuilderStore } from '@/features/builder/builderStore';
import { GithubDialog } from './GithubDialog';
import { DeployDialog } from './DeployDialog';
import { KnowledgeDialog } from './KnowledgeDialog';
import {
  getQuickActions,
  type QuickAction,
} from '@/features/builder/suggestions/contextualActions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ICONS = {
  sparkles: Sparkles,
  shield: Shield,
  database: Database,
  smartphone: Smartphone,
  rocket: Rocket,
  github: GitBranch,
  'layout-dashboard': LayoutDashboard,
  search: Search,
  image: ImageIcon,
  chart: BarChart3,
  'shopping-cart': ShoppingCart,
  package: Package,
  history: History,
  users: Users,
  'credit-card': CreditCard,
  palette: Palette,
  zap: Zap,
} as const;

const toneClasses: Record<NonNullable<QuickAction['tone']>, string> = {
  primary:
    'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50',
  accent:
    'bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 hover:border-accent/50',
  muted: 'bg-muted/40 text-foreground border-border hover:bg-muted',
};

const KIND_LABELS: Record<string, string> = {
  landing: 'Landing',
  dashboard: 'Dashboard',
  pos: 'POS',
  crm: 'CRM',
  notes: 'Notas',
  marketplace: 'Marketplace',
  saas: 'SaaS',
  unknown: 'App',
};

/**
 * Contextual quick-actions bar shown directly under the project header.
 * Detects what the user is building and renders 4 inline buttons + a
 * "Más" popover with the rest. Each button either dispatches a real
 * prompt to the AI (modifying code/files) or opens a UI flow (GitHub,
 * Deploy). This is the "copilot strip" that makes Nexa One feel
 * proactive instead of just a chat.
 */
export function QuickActionsBar() {
  const files = useBuilderStore((s) => s.files);
  const projectName = useBuilderStore((s) => s.projectName);
  const projectId = useBuilderStore((s) => s.projectId);
  const loading = useBuilderStore((s) => s.loading);
  const streaming = useBuilderStore((s) => s.streaming);
  const sendPrompt = useBuilderStore((s) => s.sendPrompt);
  const toggleChat = useBuilderStore((s) => s.toggleChat);
  const chatOpen = useBuilderStore((s) => s.chatOpen);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);

  const { kind, actions } = useMemo(
    () => getQuickActions(projectName, files),
    [projectName, files],
  );

  if (files.length === 0) return null;

  const busy = loading || streaming;
  // First 4 inline, rest in popover. On narrow viewports we collapse to 2.
  const inline = actions.slice(0, 4);
  const overflow = actions.slice(4);

  const runAction = (action: QuickAction) => {
    if (action.uiAction === 'open-github') {
      if (!projectId) { toast.info('Abre un proyecto primero'); return; }
      setGithubOpen(true);
      return;
    }
    if (action.uiAction === 'open-deploy') {
      if (!projectId) { toast.info('Abre un proyecto primero'); return; }
      if (files.length === 0) { toast.info('Genera una app primero'); return; }
      setDeployOpen(true);
      return;
    }
    if (action.uiAction === 'open-knowledge') {
      if (!projectId) { toast.info('Abre un proyecto primero'); return; }
      setKnowledgeOpen(true);
      return;
    }
    if (action.uiAction === 'open-share') {
      toast.info('Usa el botón de compartir en el header');
      return;
    }
    if (busy) {
      toast.info('La IA está ocupada, espera a que termine');
      return;
    }
    if (!chatOpen) toggleChat();
    sendPrompt(action.prompt).catch((err) => {
      toast.error(err instanceof Error ? err.message : 'Error al ejecutar acción');
    });
    toast.success(`Ejecutando: ${action.label}`);
  };

  const renderButton = (action: QuickAction, compact = false) => {
    const Icon = action.icon ? ICONS[action.icon] ?? Sparkles : Sparkles;
    return (
      <button
        key={action.id}
        type="button"
        onClick={() => runAction(action)}
        disabled={busy && !action.uiAction}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-50 disabled:pointer-events-none',
          compact && 'px-2',
          toneClasses[action.tone ?? 'muted'],
        )}
        title={action.prompt || action.label}
      >
        {busy && !action.uiAction ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Icon className="h-3 w-3" />
        )}
        <span>{action.label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/40 bg-card/40 px-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="hidden sm:inline">Copiloto</span>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
          {KIND_LABELS[kind] ?? 'App'}
        </span>
      </div>

      <div className="mx-1 h-4 w-px bg-border/50" />

      <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none">
        {inline.map((a) => renderButton(a))}
      </div>

      {overflow.length > 0 && (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Más</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Más acciones del copiloto
            </div>
            <div className="flex flex-wrap gap-1.5">
              {overflow.map((a) => (
                <div
                  key={a.id}
                  onClick={() => {
                    setPopoverOpen(false);
                  }}
                >
                  {renderButton(a, true)}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {projectId && (
        <>
          <GithubDialog
            open={githubOpen}
            onClose={() => setGithubOpen(false)}
            projectId={projectId}
            projectName={projectName}
            files={files}
          />
          <DeployDialog
            open={deployOpen}
            onClose={() => setDeployOpen(false)}
            projectId={projectId}
            projectName={projectName}
            files={files}
          />
          <KnowledgeDialog
            open={knowledgeOpen}
            onClose={() => setKnowledgeOpen(false)}
            projectId={projectId}
          />
        </>
      )}
    </div>
  );
}