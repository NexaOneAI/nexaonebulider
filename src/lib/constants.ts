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
  GPT5: 'openai/gpt-5',
  GPT5_MINI: 'openai/gpt-5-mini',
  GEMINI_PRO: 'google/gemini-2.5-pro',
  GEMINI_FLASH: 'google/gemini-3-flash-preview',
  GEMINI_FLASH_LITE: 'google/gemini-2.5-flash-lite',
} as const;

export const AI_MODEL_LABELS: Record<string, string> = {
  [AI_MODELS.GPT5]: 'OpenAI GPT-5',
  [AI_MODELS.GPT5_MINI]: 'OpenAI GPT-5 Mini',
  [AI_MODELS.GEMINI_PRO]: 'Gemini 2.5 Pro',
  [AI_MODELS.GEMINI_FLASH]: 'Gemini 3 Flash',
  [AI_MODELS.GEMINI_FLASH_LITE]: 'Gemini 2.5 Flash Lite',
};

export const DEFAULT_MODEL = AI_MODELS.GEMINI_FLASH;

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
