import type { GeneratedFile } from '@/features/projects/projectTypes';

export type AppKind =
  | 'unknown'
  | 'landing'
  | 'dashboard'
  | 'pos'
  | 'crm'
  | 'notes'
  | 'marketplace'
  | 'saas'
  | 'admin'
  | 'mobile';

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  /** Visual tone for the button. */
  tone?: 'primary' | 'accent' | 'muted';
  /** Optional lucide icon name (resolved in the UI). */
  icon?:
    | 'sparkles'
    | 'shield'
    | 'database'
    | 'smartphone'
    | 'rocket'
    | 'github'
    | 'layout-dashboard'
    | 'search'
    | 'image'
    | 'chart'
    | 'shopping-cart'
    | 'package'
    | 'history'
    | 'users'
    | 'credit-card'
    | 'palette'
    | 'zap';
  /**
   * Optional UI action to run instead of (or in addition to) sending a prompt.
   * Lets a button open a dialog (GitHub, Deploy, etc.) when that's the right UX.
   */
  uiAction?:
    | 'open-github'
    | 'open-deploy'
    | 'open-knowledge'
    | 'open-share'
    | 'activate-pwa'
    | 'regenerate-pwa-icon';
}

/**
 * Optional extra signals fed into the detector. All fields are optional so
 * existing call sites (that only pass name + files) keep working.
 */
export interface DetectionContext {
  description?: string;
  /** Last user message in the chat — captures live intent ("agrega carrito"). */
  lastUserPrompt?: string;
}

/**
 * Project capability signals — derived from current files. Used to FILTER
 * already-completed actions out of the suggestions list (e.g. don't suggest
 * "Activar PWA" if the manifest is already there).
 */
export interface ProjectSignals {
  fileCount: number;
  hasPwa: boolean;
  hasAuth: boolean;
  hasSupabase: boolean;
  hasRouter: boolean;
  hasSeoMeta: boolean;
  hasAdminPanel: boolean;
  hasCart: boolean;
  hasCharts: boolean;
  hasInventory: boolean;
  hasPayments: boolean;
}

/** Cheap content-based capability detector. Runs on every render — no cache. */
export function detectProjectSignals(files: GeneratedFile[]): ProjectSignals {
  const safeFiles = Array.isArray(files) ? files : [];
  const paths = safeFiles.map((f) => String(f?.path ?? '').toLowerCase()).join(' \n ');
  const sample = safeFiles
    .slice(0, 20)
    .map((f) => String(f?.content ?? '').slice(0, 800).toLowerCase())
    .join(' \n ');
  const all = `${paths}\n${sample}`;

  const has = (...needles: string[]) => needles.some((n) => all.includes(n));

  return {
    fileCount: safeFiles.length,
    hasPwa: has('manifest.webmanifest', 'manifest.json', 'registersw', 'vite-plugin-pwa', 'serviceworker'),
    hasAuth: has('supabase.auth', 'signinwithpassword', 'signup', '/login', 'use-auth', 'authprovider'),
    hasSupabase: has('@supabase/supabase-js', 'createclient(', 'supabase.from(', 'integrations/supabase'),
    hasRouter: has('react-router', 'createbrowserrouter', '<route ', 'browserrouter'),
    hasSeoMeta: has('<meta name="description"', 'og:title', 'application/ld+json'),
    hasAdminPanel: has('/admin', 'has_role(', 'user_roles', 'app_role'),
    hasCart: has('cart', 'carrito', 'addtocart', 'checkout'),
    hasCharts: has('recharts', 'chart.js', '<linechart', '<barchart', 'd3-'),
    hasInventory: has('inventory', 'inventario', 'stock'),
    hasPayments: has('stripe', 'mercadopago', 'paddle', 'create-payment'),
  };
}

/**
 * Map: action id → predicate that returns TRUE when the action is already
 * satisfied and should be filtered out of the suggestions list. Anything not
 * listed here is considered always-relevant.
 */
const ACTION_DONE: Record<string, (sig: ProjectSignals) => boolean> = {
  pwa: (s) => s.hasPwa,
  'pwa-icon': (s) => !s.hasPwa, // hide until PWA is enabled
  'admin-panel': (s) => s.hasAdminPanel,
  auth: (s) => s.hasAuth,
  database: (s) => s.hasSupabase,
  seo: (s) => s.hasSeoMeta,
  cart: (s) => !s.hasCart, // POS-only; only show when cart already exists to "improve" it
  inventory: (s) => s.hasInventory,
  'add-chart': (s) => s.hasCharts,
  payments: (s) => s.hasPayments,
  'pwa-install': (s) => s.hasPwa,
};

/** Score-based detector. Each kind accumulates points from multiple signals. */
function score(haystack: string, words: string[]): number {
  let n = 0;
  for (const w of words) {
    if (!w) continue;
    // Word-boundary-ish check: count occurrences as substring (cheap + good enough).
    const idx = haystack.indexOf(w);
    if (idx >= 0) n += 1;
  }
  return n;
}

const KIND_KEYWORDS: Record<Exclude<AppKind, 'unknown'>, string[]> = {
  pos: ['pos', 'punto de venta', 'carrito', 'checkout', 'cart', 'caja', 'inventario', 'tpv', 'venta'],
  crm: ['crm', 'leads', 'lead ', 'contactos', 'pipeline', 'deals', 'oportunidad', 'kanban'],
  marketplace: ['marketplace', 'listings', 'sellers', 'vendedores', 'catálogo', 'catalogo', 'producto', 'tienda'],
  notes: ['notes', 'notas', 'markdown editor', 'note app', 'apuntes', 'editor'],
  dashboard: ['dashboard', 'analytics', 'kpi', 'charts', 'gráficos', 'graficos', 'métricas', 'metricas', 'panel'],
  landing: ['landing', 'hero ', 'pricing', 'testimonials', 'testimonios', 'cta', 'lead magnet'],
  saas: ['saas', 'subscription', 'tenants', 'workspace', 'plan ', 'suscripción', 'suscripcion', 'multi-tenant'],
  admin: ['admin', 'administraci', 'backoffice', 'gestión', 'gestion', 'usuarios', 'roles'],
  mobile: ['pwa', 'móvil', 'movil', 'mobile app', 'app móvil', 'instalable', 'offline'],
};

/**
 * Heuristic detector — looks at the project name and the file paths/contents
 * of the current generated app to infer what the user is building. Only used
 * to pick relevant quick-action prompts; never persisted.
 */
export function detectAppKind(
  projectName: string,
  files: GeneratedFile[],
  ctx: DetectionContext = {},
): AppKind {
  const safeFiles = Array.isArray(files) ? files : [];
  const haystack = [
    String(projectName ?? '').toLowerCase(),
    String(ctx.description ?? '').toLowerCase(),
    // Latest user prompts carry the strongest live intent — weight them x2.
    String(ctx.lastUserPrompt ?? '').toLowerCase(),
    String(ctx.lastUserPrompt ?? '').toLowerCase(),
    ...safeFiles.map((f) => String(f?.path ?? '').toLowerCase()),
    // Sample first ~12 files' content so we don't blow up on huge apps.
    ...safeFiles
      .slice(0, 12)
      .map((f) => String(f?.content ?? '').slice(0, 400).toLowerCase()),
  ].join(' \n ');

  let bestKind: AppKind = 'unknown';
  let bestScore = 0;
  (Object.keys(KIND_KEYWORDS) as Exclude<AppKind, 'unknown'>[]).forEach((kind) => {
    const s = score(haystack, KIND_KEYWORDS[kind]);
    // Tie-breaker: prefer the more "specific" verticals over generic ones.
    const specificityBoost = kind === 'admin' || kind === 'mobile' ? 0 : 0.1;
    const total = s + (s > 0 ? specificityBoost : 0);
    if (total > bestScore) {
      bestScore = total;
      bestKind = kind;
    }
  });
  return bestKind;
}

/** Always-useful actions, regardless of app type. */
const BASE_ACTIONS: QuickAction[] = [
  {
    id: 'pwa',
    label: 'Activar PWA',
    tone: 'accent',
    icon: 'smartphone',
    prompt: '',
    uiAction: 'activate-pwa',
  },
  {
    id: 'pwa-icon',
    label: 'Regenerar icono PWA',
    tone: 'muted',
    icon: 'image',
    prompt: '',
    uiAction: 'regenerate-pwa-icon',
  },
  {
    id: 'admin-panel',
    label: 'Agregar panel admin',
    tone: 'primary',
    icon: 'layout-dashboard',
    prompt:
      'Agrega un panel de administración protegido por rol: crea tabla user_roles separada con enum app_role, función has_role security definer, ruta /admin con guard, y vista de gestión de usuarios y métricas básicas.',
  },
  {
    id: 'seo',
    label: 'Mejorar SEO',
    tone: 'muted',
    icon: 'search',
    prompt:
      'Optimiza SEO: title <60 chars con keyword, meta description <160 chars, un solo H1, HTML semántico, alt text en imágenes, JSON-LD, canonical y viewport responsive.',
  },
  {
    id: 'mobile',
    label: 'Optimizar para móvil',
    tone: 'muted',
    icon: 'smartphone',
    prompt:
      'Revisa toda la app y mejora la experiencia móvil: usa breakpoints de Tailwind correctamente, asegura que los botones sean tappables (mínimo 44px), arregla overflows, y verifica que los modales se conviertan en sheets en pantallas pequeñas.',
  },
  {
    id: 'auth',
    label: 'Agregar autenticación',
    tone: 'primary',
    icon: 'shield',
    prompt:
      'Agrega autenticación con email y contraseña usando Supabase: pantalla de login, registro, logout, y proteger las rutas privadas. Crea tabla profiles con trigger para autocrearla en signup.',
  },
  {
    id: 'database',
    label: 'Conectar base de datos',
    tone: 'primary',
    icon: 'database',
    prompt:
      'Identifica los datos que la app necesita persistir y crea las tablas correspondientes en Supabase con RLS estricto por user_id. Reemplaza cualquier estado en memoria o localStorage por consultas reales.',
  },
  {
    id: 'github',
    label: 'Conectar GitHub',
    tone: 'muted',
    icon: 'github',
    prompt: '',
    uiAction: 'open-github',
  },
  {
    id: 'deploy-ready',
    label: 'Preparar para deploy',
    tone: 'accent',
    icon: 'rocket',
    prompt:
      'Revisa la app y déjala lista para producción: limpia console.logs, valida que el build pase, asegura SPA routing correcto, agrega meta tags SEO básicos y verifica que las variables de entorno estén bien usadas.',
  },
  {
    id: 'deploy-now',
    label: 'Desplegar ahora',
    tone: 'accent',
    icon: 'rocket',
    prompt: '',
    uiAction: 'open-deploy',
  },
];

const KIND_ACTIONS: Record<AppKind, QuickAction[]> = {
  unknown: [],
  landing: [
    {
      id: 'cta-section',
      label: 'Agregar sección de CTA',
      tone: 'primary',
      icon: 'sparkles',
      prompt: 'Añade una sección de call-to-action prominente antes del footer con un formulario de captura de email.',
    },
    {
      id: 'pricing',
      label: 'Agregar tabla de precios',
      tone: 'accent',
      icon: 'credit-card',
      prompt: 'Agrega una sección de pricing con 3 planes (Free, Pro, Enterprise), comparativa de features y botón de upgrade.',
    },
    {
      id: 'testimonials',
      label: 'Agregar testimonios',
      tone: 'muted',
      icon: 'users',
      prompt: 'Añade una sección de testimonios con avatares, nombre, rol y quote, en grid responsive.',
    },
    {
      id: 'animations',
      label: 'Agregar animaciones',
      tone: 'muted',
      icon: 'palette',
      prompt: 'Añade animaciones sutiles tipo Apple: fade-in al hacer scroll con IntersectionObserver, hover states con transitions suaves, y un hero con parallax ligero.',
    },
  ],
  dashboard: [
    {
      id: 'add-chart',
      label: 'Agregar gráfico',
      tone: 'primary',
      prompt: 'Añade un gráfico de líneas con recharts mostrando una métrica clave de la última semana.',
    },
    {
      id: 'kpi-cards',
      label: 'Tarjetas KPI',
      tone: 'accent',
      prompt: 'Agrega una fila de 4 tarjetas KPI en la parte superior del dashboard con icono, valor grande y delta vs período anterior.',
    },
    {
      id: 'data-table',
      label: 'Tabla con filtros',
      tone: 'muted',
      prompt: 'Agrega una tabla con búsqueda, ordenamiento por columna y paginación.',
    },
  ],
  pos: [
    {
      id: 'cart',
      label: 'Mejorar carrito',
      tone: 'primary',
      prompt: 'Mejora el carrito: cantidades editables, eliminar item, total dinámico y botón de cobrar destacado.',
    },
    {
      id: 'inventory',
      label: 'Control de inventario',
      tone: 'accent',
      prompt: 'Agrega control de stock por producto: descontar al vender, alertar cuando esté bajo y bloquear venta si es 0.',
    },
    {
      id: 'sales-history',
      label: 'Historial de ventas',
      tone: 'muted',
      prompt: 'Agrega una pantalla de historial de ventas con fecha, total y detalle expandible de items.',
    },
  ],
  crm: [
    {
      id: 'pipeline',
      label: 'Vista pipeline',
      tone: 'primary',
      prompt: 'Agrega vista kanban del pipeline con drag & drop entre etapas (lead, contactado, propuesta, ganado, perdido).',
    },
    {
      id: 'contact-form',
      label: 'Formulario de contactos',
      tone: 'accent',
      prompt: 'Crea formulario de alta/edición de contactos con nombre, email, teléfono, empresa y notas.',
    },
  ],
  notes: [
    {
      id: 'tags',
      label: 'Agregar tags',
      tone: 'primary',
      prompt: 'Agrega sistema de tags a las notas con colores y filtro lateral.',
    },
    {
      id: 'search',
      label: 'Búsqueda de notas',
      tone: 'accent',
      prompt: 'Agrega búsqueda en vivo por título y contenido de las notas.',
    },
  ],
  marketplace: [
    {
      id: 'filters',
      label: 'Filtros avanzados',
      tone: 'primary',
      icon: 'search',
      prompt: 'Agrega filtros laterales por categoría, rango de precio y rating.',
    },
    {
      id: 'product-detail',
      label: 'Página de producto',
      tone: 'accent',
      icon: 'package',
      prompt: 'Crea página de detalle de producto con galería, descripción, reviews y botón de comprar.',
    },
    {
      id: 'sellers',
      label: 'Perfiles de vendedores',
      tone: 'muted',
      icon: 'users',
      prompt: 'Agrega perfiles públicos de vendedores con avatar, descripción, rating promedio y listado de sus productos.',
    },
    {
      id: 'payments',
      label: 'Integrar pagos',
      tone: 'accent',
      icon: 'credit-card',
      prompt: 'Agrega checkout con integración de pagos (Stripe o MercadoPago) usando edge functions seguras y webhook para confirmar la orden.',
    },
  ],
  saas: [
    {
      id: 'workspaces',
      label: 'Multi-tenant',
      tone: 'primary',
      icon: 'users',
      prompt: 'Agrega soporte multi-workspace: cada usuario puede crear y unirse a workspaces, con datos aislados por RLS.',
    },
    {
      id: 'billing',
      label: 'Planes y billing',
      tone: 'accent',
      icon: 'credit-card',
      prompt: 'Agrega pantalla de billing con plan actual, comparativa y botón de upgrade.',
    },
    {
      id: 'saas-dashboard',
      label: 'Dashboard de cuenta',
      tone: 'muted',
      icon: 'layout-dashboard',
      prompt: 'Agrega dashboard de cuenta con métricas de uso, miembros del workspace y quick actions de configuración.',
    },
  ],
  admin: [
    {
      id: 'admin-users',
      label: 'Gestión de usuarios',
      tone: 'primary',
      icon: 'users',
      prompt: 'Agrega CRUD de usuarios con búsqueda, filtro por rol, suspender/activar cuenta, y modal de detalle. Usa la tabla user_roles separada y has_role security definer.',
    },
    {
      id: 'admin-roles',
      label: 'Permisos por rol',
      tone: 'accent',
      icon: 'shield',
      prompt: 'Agrega gestión de roles (admin/moderator/user) usando una tabla user_roles separada con enum app_role y función has_role SECURITY DEFINER. Aplica las RLS correspondientes.',
    },
    {
      id: 'admin-audit',
      label: 'Audit log',
      tone: 'muted',
      icon: 'history',
      prompt: 'Agrega un audit log: tabla audit_logs con user_id, action, target, metadata jsonb, created_at. Insertar desde edge functions y mostrarlo en una vista admin con filtros.',
    },
  ],
  mobile: [
    {
      id: 'pwa-install',
      label: 'Hacer instalable',
      tone: 'primary',
      icon: 'smartphone',
      uiAction: 'activate-pwa',
      prompt: '',
    },
    {
      id: 'mobile-bottom-nav',
      label: 'Navegación inferior',
      tone: 'accent',
      icon: 'layout-dashboard',
      prompt: 'Agrega una bottom navigation bar fija para móvil (oculta en desktop) con 4 items principales, iconos y estado activo.',
    },
    {
      id: 'mobile-touch',
      label: 'Optimizar táctil',
      tone: 'muted',
      icon: 'smartphone',
      prompt: 'Aumenta el área tappable de todos los botones (min 44x44), añade :active states con scale-95, y reemplaza tooltips por long-press hints en móvil.',
    },
  ],
};

export function getQuickActions(
  projectName: string,
  files: GeneratedFile[],
  ctx: DetectionContext = {},
): {
  kind: AppKind;
  actions: QuickAction[];
} {
  const kind = detectAppKind(projectName, files, ctx);
  const specific = KIND_ACTIONS[kind] ?? [];
  // Specific first, then base. We return up to 12 — the bar shows the first
  // few inline and tucks the rest behind a "Más" popover.
  return { kind, actions: [...specific, ...BASE_ACTIONS].slice(0, 12) };
}