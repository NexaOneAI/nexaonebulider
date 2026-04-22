import type { GeneratedFile } from '@/features/projects/projectTypes';

export type AppKind =
  | 'unknown'
  | 'landing'
  | 'dashboard'
  | 'pos'
  | 'crm'
  | 'notes'
  | 'marketplace'
  | 'saas';

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
  uiAction?: 'open-github' | 'open-deploy' | 'open-knowledge' | 'open-share';
}

/**
 * Heuristic detector — looks at the project name and the file paths/contents
 * of the current generated app to infer what the user is building. Only used
 * to pick relevant quick-action prompts; never persisted.
 */
export function detectAppKind(projectName: string, files: GeneratedFile[]): AppKind {
  const haystack = [
    projectName.toLowerCase(),
    ...files.map((f) => f.path.toLowerCase()),
    // Sample a slice of file content so we don't blow the heuristic up on huge apps.
    ...files.slice(0, 12).map((f) => (f.content || '').slice(0, 400).toLowerCase()),
  ].join(' \n ');

  const has = (...words: string[]) => words.some((w) => haystack.includes(w));

  if (has('pos', 'punto de venta', 'carrito', 'checkout', 'cart')) return 'pos';
  if (has('crm', 'leads', 'contactos', 'pipeline', 'deals')) return 'crm';
  if (has('marketplace', 'listings', 'sellers', 'vendedores')) return 'marketplace';
  if (has('notes', 'notas', 'markdown editor', 'note app')) return 'notes';
  if (has('dashboard', 'analytics', 'kpi', 'charts', 'gráficos')) return 'dashboard';
  if (has('landing', 'hero section', 'pricing', 'testimonials')) return 'landing';
  if (has('saas', 'subscription', 'tenants', 'workspace')) return 'saas';
  return 'unknown';
}

/** Always-useful actions, regardless of app type. */
const BASE_ACTIONS: QuickAction[] = [
  {
    id: 'pwa',
    label: 'Activar PWA',
    tone: 'accent',
    icon: 'smartphone',
    prompt:
      'Convierte la app en PWA instalable: agrega manifest.webmanifest con íconos e información del negocio, registra un service worker (solo en producción, deshabilitado en iframes/preview), y añade meta tags para "Add to Home Screen" en iOS y Android.',
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
      prompt: 'Añade una sección de call-to-action prominente antes del footer con un formulario de captura de email.',
    },
    {
      id: 'pricing',
      label: 'Agregar tabla de precios',
      tone: 'accent',
      prompt: 'Agrega una sección de pricing con 3 planes (Free, Pro, Enterprise), comparativa de features y botón de upgrade.',
    },
    {
      id: 'testimonials',
      label: 'Agregar testimonios',
      tone: 'muted',
      prompt: 'Añade una sección de testimonios con avatares, nombre, rol y quote, en grid responsive.',
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
      prompt: 'Agrega filtros laterales por categoría, rango de precio y rating.',
    },
    {
      id: 'product-detail',
      label: 'Página de producto',
      tone: 'accent',
      prompt: 'Crea página de detalle de producto con galería, descripción, reviews y botón de comprar.',
    },
  ],
  saas: [
    {
      id: 'workspaces',
      label: 'Multi-tenant',
      tone: 'primary',
      prompt: 'Agrega soporte multi-workspace: cada usuario puede crear y unirse a workspaces, con datos aislados por RLS.',
    },
    {
      id: 'billing',
      label: 'Planes y billing',
      tone: 'accent',
      prompt: 'Agrega pantalla de billing con plan actual, comparativa y botón de upgrade.',
    },
  ],
};

export function getQuickActions(projectName: string, files: GeneratedFile[]): {
  kind: AppKind;
  actions: QuickAction[];
} {
  const kind = detectAppKind(projectName, files);
  const specific = KIND_ACTIONS[kind] ?? [];
  // Specific first, then base — capped to 6 to avoid noise.
  return { kind, actions: [...specific, ...BASE_ACTIONS].slice(0, 6) };
}