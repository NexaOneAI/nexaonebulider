import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe nested property access. Never throws.
 *
 *   safe(user, "onboarding.step", "start")  // → "start" if anything is missing
 *
 * Use this anywhere we read from objects that may be `undefined`/`null`
 * during loading (auth, onboarding, profile, etc.) to avoid crashing the
 * React tree and showing a white screen.
 */
export function safe<T = unknown>(
  obj: unknown,
  path: string,
  fallback: T | null = null,
): T | null {
  try {
    if (obj == null || !path) return fallback;
    const value = path
      .split('.')
      .reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), obj);
    return (value === undefined || value === null ? fallback : (value as T));
  } catch {
    return fallback;
  }
}
