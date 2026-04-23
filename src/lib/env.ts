/**
 * Safe environment variable access.
 * Never throws if `import.meta` or `import.meta.env` is undefined
 * (e.g. inside generated previews, SSR, web workers, or stripped builds).
 *
 * IMPORTANT: Vite replaces `import.meta.env.VITE_*` as STATIC STRING LITERALS
 * at build time. Any indirection (e.g. `const env = import.meta.env; env.VITE_FOO`)
 * defeats this substitution and returns `undefined` in production.
 * Therefore we MUST reference each VITE_* var by its full literal expression.
 */

function safeRead<T>(read: () => T, fallback: T): T {
  try {
    const v = read();
    return v === undefined || v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

/**
 * Each property accesses `import.meta.env.<NAME>` *directly* so Vite can perform
 * its compile-time string substitution. Wrapped in try/catch so that if
 * `import.meta` is somehow stripped (web worker, sandboxed eval), we fall back
 * to safe defaults instead of throwing at module load.
 */
export const env = {
  PROD: safeRead(() => Boolean(import.meta.env.PROD), false),
  DEV: safeRead(() => Boolean(import.meta.env.DEV), false),
  MODE: safeRead(() => String(import.meta.env.MODE ?? 'production'), 'production'),
  BASE_URL: safeRead(() => String(import.meta.env.BASE_URL ?? '/'), '/'),
  SUPABASE_URL: safeRead(() => String(import.meta.env.VITE_SUPABASE_URL ?? ''), ''),
  SUPABASE_PUBLISHABLE_KEY: safeRead(
    () => String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''),
    '',
  ),
  SUPABASE_PROJECT_ID: safeRead(
    () => String(import.meta.env.VITE_SUPABASE_PROJECT_ID ?? ''),
    '',
  ),
};

export function isProd(): boolean {
  return env.PROD;
}

export function isDev(): boolean {
  return env.DEV;
}

/**
 * Returns the list of *required* VITE_* keys that are missing or empty.
 * Used by the boot screen to render a friendly warning instead of a blank page.
 */
export function getMissingSupabaseEnv(): string[] {
  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!env.SUPABASE_PUBLISHABLE_KEY) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  return missing;
}

export function hasSupabaseEnv(): boolean {
  return getMissingSupabaseEnv().length === 0;
}
