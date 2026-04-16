// Application constants
export const APP_NAME = 'Nexa One Builder';
export const APP_VERSION = '1.0.0';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  BUILDER: '/builder/:projectId',
  PROJECT: '/project/:projectId',
  BILLING: '/billing',
  ADMIN: '/admin',
} as const;

export const AI_MODELS = {
  OPENAI: 'openai',
  CLAUDE: 'claude',
  GEMINI: 'gemini',
  CUSTOM: 'custom',
} as const;

export const AI_MODEL_LABELS: Record<string, string> = {
  [AI_MODELS.OPENAI]: 'OpenAI GPT-4',
  [AI_MODELS.CLAUDE]: 'Claude 3.5',
  [AI_MODELS.GEMINI]: 'Gemini Pro',
  [AI_MODELS.CUSTOM]: 'Custom Model',
};

export const CREDIT_COSTS = {
  simple_task: 2,
  simple_edit: 3,
  medium_module: 5,
  complex_module: 8,
  full_app: 12,
} as const;

export const CREDIT_PACKAGES = [
  { id: 'starter', name: 'Starter', credits: 50, price_mxn: 99, popular: false },
  { id: 'builder', name: 'Builder', credits: 150, price_mxn: 249, popular: true },
  { id: 'pro', name: 'Pro', credits: 500, price_mxn: 699, popular: false },
  { id: 'enterprise', name: 'Enterprise', credits: 2000, price_mxn: 2499, popular: false },
] as const;

export const VIEW_MODES = {
  DESKTOP: 'desktop',
  TABLET: 'tablet',
  MOBILE: 'mobile',
} as const;

export const VIEW_WIDTHS: Record<string, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};
