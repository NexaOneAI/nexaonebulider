/**
 * Safe environment variable access.
 * Never throws if `import.meta` or `import.meta.env` is undefined
 * (e.g. inside generated previews, SSR, web workers, or stripped builds).
 */

type ViteEnv = {
  PROD?: boolean;
  DEV?: boolean;
  MODE?: string;
  BASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
  [key: string]: unknown;
};

function readEnv(): ViteEnv {
  try {
    // import.meta may be undefined in non-module contexts
    const meta = (typeof import.meta !== 'undefined' ? import.meta : undefined) as
      | ImportMeta
      | undefined;
    const env = meta && (meta as unknown as { env?: ViteEnv }).env;
    return env && typeof env === 'object' ? env : {};
  } catch {
    return {};
  }
}

const ENV = readEnv();

export const env = {
  PROD: Boolean(ENV.PROD),
  DEV: Boolean(ENV.DEV),
  MODE: typeof ENV.MODE === 'string' ? ENV.MODE : 'production',
  BASE_URL: typeof ENV.BASE_URL === 'string' ? ENV.BASE_URL : '/',
  SUPABASE_URL: typeof ENV.VITE_SUPABASE_URL === 'string' ? ENV.VITE_SUPABASE_URL : '',
  SUPABASE_PUBLISHABLE_KEY:
    typeof ENV.VITE_SUPABASE_PUBLISHABLE_KEY === 'string'
      ? ENV.VITE_SUPABASE_PUBLISHABLE_KEY
      : '',
  SUPABASE_PROJECT_ID:
    typeof ENV.VITE_SUPABASE_PROJECT_ID === 'string' ? ENV.VITE_SUPABASE_PROJECT_ID : '',
};

export function isProd(): boolean {
  return env.PROD;
}

export function isDev(): boolean {
  return env.DEV;
}
