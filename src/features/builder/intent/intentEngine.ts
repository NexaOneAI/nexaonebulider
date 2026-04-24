/**
 * Nexa One — Intent Engine (Fase 1, heurístico).
 *
 * Convierte el estado del proyecto + el último prompt del usuario en un
 * "plan accionable" estructurado que la UI puede mostrar antes de tocar
 * archivos. La filosofía es:
 *
 *   1. Reusar TODO lo que ya construimos (detectAppKind, obtenerNivelProyecto,
 *      detectProjectSignals, getQuickActions). El motor no inventa señales —
 *      orquesta las existentes.
 *   2. Determinista y gratis (0 cr\u00e9ditos, 0 latencia). Una capa LLM
 *      opcional puede llamarse desde la UI bajo demanda en una pr\u00f3xima
 *      fase, pero NO es necesaria para que el motor funcione.
 *   3. Producir SIEMPRE un plan ejecutable: la "Confirmaci\u00f3n" en la UI
 *      simplemente dispara `sendPrompt(plan.prompt)` por el flujo de
 *      edit-stream que ya existe — cero infra nueva, se beneficia del
 *      versionado autom\u00e1tico (revertir = cargar versi\u00f3n anterior).
 */

import type { GeneratedFile } from '@/features/projects/projectTypes';
import {
  detectAppKind,
  detectProjectSignals,
  obtenerNivelProyecto,
  getQuickActions,
  LEVEL_LABELS,
  type AppKind,
  type ProjectLevel,
  type ProjectSignals,
  type QuickAction,
} from '@/features/builder/suggestions/contextualActions';

export type IntentRisk = 'low' | 'medium' | 'high';

export interface IntentPlan {
  /** Acci\u00f3n base recomendada (ya viene de getQuickActions). */
  action: QuickAction;
  /** Intenci\u00f3n humana inferida ("Inicializar cat\u00e1logo del POS"). */
  intent: string;
  /** M\u00f3dulo l\u00f3gico que toca ("catalog", "cart", "auth", ...). */
  module: string;
  /** Una frase con el "por qu\u00e9" basada en signals + nivel. */
  reason: string;
  /** Riesgo estructural del cambio. */
  risk: IntentRisk;
  /** Estimaci\u00f3n grosera de cr\u00e9ditos a consumir. */
  estimatedCredits: number;
  /** Archivos que probablemente se tocan (paths relativos, mejores guesses). */
  filesAffected: string[];
  /** Qu\u00e9 deber\u00eda existir despu\u00e9s del cambio (validaci\u00f3n). */
  expectedOutcome: string;
  /** Prompt final que se mandar\u00e1 a la IA cuando el usuario confirme. */
  prompt: string;
}

export interface IntentSnapshot {
  kind: AppKind;
  kindLabel: string;
  level: ProjectLevel;
  levelLabel: string;
  signals: ProjectSignals;
  /** Plan principal (siguiente paso recomendado). */
  primary: IntentPlan | null;
  /** Planes alternativos para el panel "otras opciones". */
  alternatives: IntentPlan[];
}

const KIND_LABELS: Record<AppKind, string> = {
  unknown: 'App',
  landing: 'Landing',
  dashboard: 'Dashboard',
  pos: 'POS',
  crm: 'CRM',
  notes: 'Notas',
  marketplace: 'Marketplace',
  saas: 'SaaS',
  admin: 'Admin',
  mobile: 'PWA',
};

/**
 * Mapeo acci\u00f3n → m\u00f3dulo l\u00f3gico. Se usa para etiquetar el plan
 * y para que la "memoria del proyecto" (Fase 4) sepa qu\u00e9 m\u00f3dulos
 * quedaron instalados despu\u00e9s de cada confirmaci\u00f3n.
 */
const ACTION_MODULE: Record<string, string> = {
  'pos-catalog': 'catalog',
  'pos-cart': 'cart',
  'pos-sales': 'sales',
  'pos-reports': 'reports',
  'pos-inventory-alerts': 'inventory',
  cart: 'cart',
  inventory: 'inventory',
  'sales-history': 'sales-history',
  'landing-hero': 'hero',
  'landing-cta-block': 'cta',
  'landing-pricing': 'pricing',
  'landing-testimonials': 'testimonials',
  'landing-faq': 'faq',
  'cta-section': 'cta',
  pricing: 'pricing',
  testimonials: 'testimonials',
  'saas-auth': 'auth',
  'saas-dashboard-shell': 'dashboard',
  'saas-workspaces': 'workspaces',
  'saas-billing': 'billing',
  'saas-team': 'team',
  auth: 'auth',
  database: 'database',
  'admin-panel': 'admin',
  'admin-users': 'admin-users',
  'admin-roles': 'admin-roles',
  'admin-audit': 'audit-log',
  'mkt-listings': 'listings',
  'mkt-detail': 'product-detail',
  'mkt-cart': 'cart',
  'mkt-payments': 'payments',
  'mkt-reviews': 'reviews',
  'dash-kpis': 'kpis',
  'dash-chart': 'charts',
  'dash-table': 'data-table',
  'dash-export': 'export',
  'dash-realtime': 'realtime',
  pwa: 'pwa',
  'pwa-install': 'pwa',
  'pwa-icon': 'pwa-icon',
  seo: 'seo',
  mobile: 'mobile-polish',
  github: 'github',
  'deploy-now': 'deploy',
  'deploy-ready': 'deploy-prep',
};

/** Heur\u00edstica de riesgo basada en m\u00f3dulo + signals. */
function inferRisk(module: string, signals: ProjectSignals): IntentRisk {
  // Cambios estructurales (auth/db/admin) son alto riesgo si ya hay c\u00f3digo
  // alrededor que los rodea — pueden romper rutas existentes.
  const HIGH = ['auth', 'database', 'admin', 'admin-roles', 'workspaces', 'payments'];
  const MEDIUM = ['dashboard', 'cart', 'sales', 'product-detail', 'billing', 'data-table'];
  if (HIGH.includes(module)) return signals.fileCount > 4 ? 'high' : 'medium';
  if (MEDIUM.includes(module)) return 'medium';
  return 'low';
}

/** Estimaci\u00f3n grosera de cr\u00e9ditos por m\u00f3dulo. */
function estimateCredits(module: string, signals: ProjectSignals): number {
  // Misma escala que el sistema de cr\u00e9ditos del proyecto:
  //   simple=2, edit=3, medium=5, complex=8, full=12
  const COMPLEX = ['auth', 'database', 'admin', 'workspaces', 'payments', 'sales', 'billing'];
  const MEDIUM = ['cart', 'dashboard', 'pricing', 'product-detail', 'charts', 'data-table'];
  const SIMPLE = ['hero', 'cta', 'testimonials', 'faq', 'kpis', 'seo'];
  if (COMPLEX.includes(module)) return 8;
  if (MEDIUM.includes(module)) return 5;
  if (SIMPLE.includes(module)) return 3;
  // Acciones puramente de UI (PWA, deploy, github) son no-LLM o muy baratas.
  if (['pwa', 'pwa-icon', 'github', 'deploy', 'deploy-prep'].includes(module)) return 0;
  return signals.fileCount > 6 ? 5 : 3;
}

/** Mejor-esfuerzo: archivos que probablemente se tocan para un m\u00f3dulo. */
function inferAffectedFiles(module: string, files: GeneratedFile[]): string[] {
  const exists = (re: RegExp) =>
    files.map((f) => f.path).filter((p) => re.test(p));
  const list: string[] = [];
  switch (module) {
    case 'auth':
      list.push('src/pages/Login.tsx', 'src/pages/Register.tsx', 'src/App.tsx');
      break;
    case 'database':
      list.push('supabase/migrations/<new>.sql', 'src/integrations/supabase/client.ts');
      break;
    case 'catalog':
      list.push('src/pages/Catalog.tsx', 'src/components/ProductCard.tsx');
      break;
    case 'cart':
      list.push('src/components/Cart.tsx', 'src/store/cartStore.ts');
      break;
    case 'sales':
      list.push('src/pages/Checkout.tsx', 'src/pages/Sales.tsx');
      break;
    case 'reports':
      list.push('src/pages/Reports.tsx');
      break;
    case 'hero':
    case 'cta':
    case 'pricing':
    case 'testimonials':
    case 'faq':
      list.push('src/pages/Index.tsx');
      break;
    case 'admin':
    case 'admin-users':
    case 'admin-roles':
      list.push('src/pages/Admin.tsx', 'supabase/migrations/<new>.sql');
      break;
    case 'dashboard':
      list.push('src/pages/Dashboard.tsx');
      break;
    case 'kpis':
    case 'charts':
    case 'data-table':
      list.push(...exists(/dashboard/i));
      break;
    case 'pwa':
    case 'pwa-icon':
      list.push('public/manifest.webmanifest', 'src/main.tsx');
      break;
    case 'seo':
      list.push('index.html', 'src/pages/Index.tsx');
      break;
    default:
      break;
  }
  // Quitar duplicados manteniendo orden.
  return Array.from(new Set(list));
}

function describeReason(level: ProjectLevel, kind: AppKind, module: string): string {
  const lvl = LEVEL_LABELS[level].toLowerCase();
  const kindStr = KIND_LABELS[kind];
  if (level === 'empty') return `Tu ${kindStr} está vacío. El primer paso lógico es activar "${module}".`;
  if (level === 'scaffold') return `${kindStr} ya tiene andamiaje. El siguiente módulo natural es "${module}".`;
  if (level === 'core') return `${kindStr} ya tiene su núcleo. Avancemos al flujo completo con "${module}".`;
  if (level === 'flow') return `${kindStr} tiene flujo end-to-end. Pulamos con "${module}".`;
  return `${kindStr} en estado ${lvl}: añadimos "${module}" para seguir mejorando.`;
}

function describeOutcome(module: string, kind: AppKind): string {
  switch (module) {
    case 'auth': return 'Usuarios pueden registrarse, iniciar sesión y cerrar sesión. Rutas privadas protegidas.';
    case 'database': return 'Tablas reales en Supabase con RLS por user_id; los datos persisten entre sesiones.';
    case 'catalog': return 'Pantalla de catálogo con productos demo, lista o grid clicable.';
    case 'cart': return 'Carrito funcional con add/remove, cantidades y total dinámico.';
    case 'sales': return 'Flujo de cobro completo, ticket generado y venta persistida.';
    case 'reports': return 'Reportes de ventas con totales y gráfico de barras.';
    case 'hero': return 'Hero principal con título, subtítulo, dos CTAs y visual atractivo.';
    case 'pricing': return 'Sección de pricing con 3 planes y plan destacado.';
    case 'admin': case 'admin-users': case 'admin-roles': return 'Panel /admin protegido por rol con gestión de usuarios.';
    case 'pwa': return 'App instalable con manifest, icon y service worker.';
    case 'seo': return 'Meta tags SEO completos, JSON-LD y H1 único.';
    default: return `Módulo "${module}" implementado y conectado a la UI del ${KIND_LABELS[kind]}.`;
  }
}

export function buildPlan(
  action: QuickAction,
  level: ProjectLevel,
  kind: AppKind,
  signals: ProjectSignals,
  files: GeneratedFile[],
): IntentPlan {
  const module = ACTION_MODULE[action.id] ?? action.id;
  const risk = inferRisk(module, signals);
  const credits = estimateCredits(module, signals);
  const filesAffected = inferAffectedFiles(module, files);
  return {
    action,
    intent: action.label,
    module,
    reason: describeReason(level, kind, module),
    risk,
    estimatedCredits: credits,
    filesAffected,
    expectedOutcome: describeOutcome(module, kind),
    prompt: action.prompt || `Implementa el módulo "${action.label}" para esta app.`,
  };
}

/** API principal del motor — produce el snapshot consumido por la UI. */
export function analyzeProject(input: {
  projectName: string;
  files: GeneratedFile[];
  lastUserPrompt?: string;
  /**
   * Ids de sugerencias / módulos ya aceptados — permite que el motor evite
   * recomendar dos veces lo mismo (memoria acumulativa). Se compara contra
   * `action.id` y contra el `module` derivado.
   */
  acceptedIds?: Set<string>;
}): IntentSnapshot {
  const { projectName, files, lastUserPrompt = '', acceptedIds } = input;
  const kind = detectAppKind(projectName, files, { lastUserPrompt });
  const signals = detectProjectSignals(files);
  const level = obtenerNivelProyecto({ kind, signals });
  const { actions } = getQuickActions(projectName, files, { lastUserPrompt });

  // El primer action ya es el "siguiente paso lógico" porque getQuickActions
  // antepone level-actions sobre kind-actions sobre base. Si no hay prompt,
  // pasa null (no debería pasar mientras haya files).
  let actionable = actions.filter((a) => !a.uiAction || a.uiAction === 'activate-pwa');
  if (acceptedIds && acceptedIds.size > 0) {
    const filtered = actionable.filter((a) => {
      const mod = ACTION_MODULE[a.id] ?? a.id;
      return !acceptedIds.has(a.id) && !acceptedIds.has(mod);
    });
    // Si TODO está aceptado, mantenemos el comportamiento original para no
    // dejar al usuario sin sugerencias (evita pantalla vacía).
    if (filtered.length > 0) actionable = filtered;
  }
  const primary = actionable[0]
    ? buildPlan(actionable[0], level, kind, signals, files)
    : null;
  const alternatives = actionable
    .slice(1, 4)
    .map((a) => buildPlan(a, level, kind, signals, files));

  return {
    kind,
    kindLabel: KIND_LABELS[kind],
    level,
    levelLabel: LEVEL_LABELS[level],
    signals,
    primary,
    alternatives,
  };
}

export const RISK_LABELS: Record<IntentRisk, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
};

/**
 * Contrato JSON estándar Nexa One.
 * Mismo shape para UI, logs y edge functions — un solo formato canónico.
 */
export interface IntentPlanJson {
  accion: string;
  modulo: string;
  archivos: string[];
  cambios: string[];
  riesgo: 'bajo' | 'medio' | 'alto';
  creditos_estimados: number;
  resultado_esperado: string;
}

const RISK_ES: Record<IntentRisk, IntentPlanJson['riesgo']> = {
  low: 'bajo',
  medium: 'medio',
  high: 'alto',
};

/** Cambios de alto nivel inferidos por módulo (frases cortas en español). */
const MODULE_CHANGES: Record<string, string[]> = {
  cart: ['crear componente carrito', 'agregar estado global', 'botón agregar producto'],
  catalog: ['crear pantalla de catálogo', 'añadir productos demo', 'tarjeta ProductCard reusable'],
  sales: ['crear flujo de cobro', 'persistir ventas', 'generar ticket'],
  reports: ['agregar reportes de ventas', 'gráfico de barras', 'totales por periodo'],
  inventory: ['control de stock', 'alertas de bajo inventario'],
  auth: ['signup + login + logout', 'rutas privadas protegidas', 'sesión persistente'],
  database: ['crear tablas', 'políticas RLS por user_id', 'integrar cliente Supabase'],
  hero: ['hero con título y subtítulo', 'dos CTAs', 'visual atractivo'],
  cta: ['sección CTA destacada'],
  pricing: ['tabla de planes', 'plan destacado'],
  testimonials: ['carrusel de testimonios'],
  faq: ['acordeón de preguntas frecuentes'],
  dashboard: ['shell del dashboard', 'navegación lateral'],
  kpis: ['tarjetas de KPIs principales'],
  charts: ['gráficos interactivos'],
  'data-table': ['tabla con orden y filtros'],
  admin: ['panel /admin protegido', 'gestión de usuarios'],
  pwa: ['manifest', 'service worker', 'app instalable'],
  seo: ['meta tags', 'JSON-LD', 'H1 único'],
};

function inferChanges(module: string, intent: string): string[] {
  return MODULE_CHANGES[module] ?? [intent.toLowerCase()];
}

/** Convierte un IntentPlan al contrato JSON canónico (español). */
export function planToJson(plan: IntentPlan): IntentPlanJson {
  return {
    accion: plan.intent,
    modulo: plan.module,
    archivos: plan.filesAffected,
    cambios: inferChanges(plan.module, plan.intent),
    riesgo: RISK_ES[plan.risk],
    creditos_estimados: plan.estimatedCredits,
    resultado_esperado: plan.expectedOutcome,
  };
}