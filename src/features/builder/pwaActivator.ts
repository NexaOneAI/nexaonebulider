import type { GeneratedFile } from '../projects/projectTypes';

/**
 * Real PWA activation for generated apps.
 *
 * Following the user's choice ("Instalable simple"), we add:
 *  - public/manifest.webmanifest
 *  - public/icon-192.svg + public/icon-512.svg (placeholder, can be regenerated)
 *  - <link rel="manifest"> + apple-touch / theme-color meta tags injected
 *    into index.html
 *
 * No service worker. The app becomes installable ("Add to Home Screen") on
 * iOS / Android and shows a proper standalone window, but stays simple and
 * stable inside the Lovable preview iframe.
 *
 * This module is pure: it takes the current files + project name and returns
 * the patched file list. The store layer is responsible for committing it
 * and saving a new version (so it persists in project_versions).
 */

export interface ActivatePwaOptions {
  /** Override the icon URL (e.g. an AI-generated PNG hosted in storage). */
  iconUrl?: string;
  /** Theme color in hex. Defaults to a neutral dark. */
  themeColor?: string;
  /** Background color in hex. */
  backgroundColor?: string;
}

export interface ActivatePwaResult {
  /** New file array (replaces store.files). */
  files: GeneratedFile[];
  /** Files that were created or modified (for UI feedback). */
  changed: string[];
  /** Whether the project was already a PWA. */
  alreadyActive: boolean;
}

const MANIFEST_PATH = 'public/manifest.webmanifest';
const ICON_192_PATH = 'public/icon-192.svg';
const ICON_512_PATH = 'public/icon-512.svg';
const INDEX_HTML_PATH = 'index.html';

/** Friendly project initials for the placeholder icon. */
function projectInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return 'A';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function shortName(name: string): string {
  const trimmed = name.trim() || 'App';
  return trimmed.length > 12 ? trimmed.slice(0, 12) : trimmed;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a tasteful SVG placeholder icon. Maskable-safe (content fits
 * within the inner ~80% safe zone) and gradient-filled so it doesn't look
 * like a 90s favicon.
 */
export function buildPlaceholderIconSvg(
  projectName: string,
  size: number,
  themeColor: string,
): string {
  const initials = escapeXml(projectInitials(projectName));
  const fontSize = Math.round(size * 0.4);
  // Lighten theme color by 30% for the gradient stop
  const stop2 = lighten(themeColor, 0.3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${themeColor}"/>
      <stop offset="100%" stop-color="${stop2}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#g)"/>
  <text x="50%" y="50%" dy=".35em" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif"
    font-size="${fontSize}" font-weight="700" fill="white" letter-spacing="-2">${initials}</text>
</svg>`;
}

/** Lighten a #rrggbb color by `amount` (0..1). Returns #rrggbb. */
function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/** Build the manifest JSON content. */
export function buildManifest(
  projectName: string,
  opts: Required<Pick<ActivatePwaOptions, 'themeColor' | 'backgroundColor'>> & {
    iconUrl?: string;
  },
): string {
  const icons = opts.iconUrl
    ? [
        { src: opts.iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: opts.iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ]
    : [
        { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
        { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
      ];
  const manifest = {
    name: projectName || 'App',
    short_name: shortName(projectName),
    description: `${projectName} — Aplicación instalable`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: opts.themeColor,
    background_color: opts.backgroundColor,
    lang: 'es',
    icons,
  };
  return JSON.stringify(manifest, null, 2);
}

/**
 * Inject PWA-related tags into index.html. Idempotent: removes any existing
 * manifest/apple-touch/theme-color tags before injecting the canonical set
 * so re-running activation doesn't duplicate them.
 */
export function patchIndexHtml(
  html: string,
  themeColor: string,
  iconHref192: string,
): string {
  // Strip prior PWA tags (manifest/apple-touch/theme-color/apple-mobile-web-app-*).
  let out = html;
  out = out.replace(/\s*<link[^>]+rel=["']manifest["'][^>]*>/gi, '');
  out = out.replace(/\s*<link[^>]+rel=["']apple-touch-icon["'][^>]*>/gi, '');
  out = out.replace(/\s*<meta[^>]+name=["']theme-color["'][^>]*>/gi, '');
  out = out.replace(/\s*<meta[^>]+name=["']apple-mobile-web-app-(capable|status-bar-style|title)["'][^>]*>/gi, '');

  const block = `
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="${iconHref192}" />
    <meta name="theme-color" content="${themeColor}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`;

  if (/<\/head>/i.test(out)) {
    return out.replace(/<\/head>/i, `${block}\n  </head>`);
  }
  // No head present (very minimal generated app) → wrap in a head section.
  if (/<html[^>]*>/i.test(out)) {
    return out.replace(/<html([^>]*)>/i, `<html$1>\n  <head>${block}\n  </head>`);
  }
  return `<head>${block}</head>\n${out}`;
}

/** Returns true if the project is already PWA-activated. */
export function isPwaActive(files: GeneratedFile[]): boolean {
  return files.some((f) => f.path === MANIFEST_PATH);
}

/**
 * Activate (or refresh) PWA support on a generated project.
 * Pure function — caller decides when to commit + save.
 */
export function activatePwa(
  files: GeneratedFile[],
  projectName: string,
  options: ActivatePwaOptions = {},
): ActivatePwaResult {
  const themeColor = options.themeColor ?? '#0a0b10';
  const backgroundColor = options.backgroundColor ?? '#0a0b10';
  const alreadyActive = isPwaActive(files);
  const changed: string[] = [];

  // Build new artifacts
  const manifestContent = buildManifest(projectName, {
    themeColor,
    backgroundColor,
    iconUrl: options.iconUrl,
  });
  const icon192 = buildPlaceholderIconSvg(projectName, 192, themeColor);
  const icon512 = buildPlaceholderIconSvg(projectName, 512, themeColor);

  const map = new Map(files.map((f) => [f.path, f] as const));

  function upsert(path: string, content: string) {
    const prev = map.get(path);
    if (!prev || prev.content !== content) {
      map.set(path, { path, content });
      changed.push(path);
    }
  }

  upsert(MANIFEST_PATH, manifestContent);

  // Only write SVG placeholder icons when no external iconUrl was provided.
  // (When the user regenerates via AI, iconUrl points to a hosted PNG and
  // the SVG fallback would just duplicate work.)
  if (!options.iconUrl) {
    upsert(ICON_192_PATH, icon192);
    upsert(ICON_512_PATH, icon512);
  }

  // Patch index.html — create a minimal one if missing.
  const indexFile = map.get(INDEX_HTML_PATH);
  const iconHref = options.iconUrl ?? '/icon-192.svg';
  if (indexFile) {
    const patched = patchIndexHtml(indexFile.content, themeColor, iconHref);
    if (patched !== indexFile.content) {
      map.set(INDEX_HTML_PATH, { path: INDEX_HTML_PATH, content: patched });
      changed.push(INDEX_HTML_PATH);
    }
  } else {
    const minimal = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeXml(projectName)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
    map.set(INDEX_HTML_PATH, {
      path: INDEX_HTML_PATH,
      content: patchIndexHtml(minimal, themeColor, iconHref),
    });
    changed.push(INDEX_HTML_PATH);
  }

  return {
    files: Array.from(map.values()),
    changed,
    alreadyActive,
  };
}