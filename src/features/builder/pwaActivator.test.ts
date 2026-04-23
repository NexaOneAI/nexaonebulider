import { describe, expect, it } from 'vitest';
import {
  activatePwa,
  buildManifest,
  buildPlaceholderIconSvg,
  isPwaActive,
  patchIndexHtml,
} from './pwaActivator';
import type { GeneratedFile } from '../projects/projectTypes';

const baseFiles: GeneratedFile[] = [
  {
    path: 'index.html',
    content: `<!doctype html><html><head><meta charset="UTF-8" /></head><body><div id="root"></div></body></html>`,
    language: 'html',
  },
  {
    path: 'src/App.tsx',
    content: 'export default function App(){return null}',
    language: 'tsx',
  },
];

describe('pwaActivator', () => {
  it('builds a valid manifest JSON with project name', () => {
    const json = buildManifest('My Cool App', {
      themeColor: '#000000',
      backgroundColor: '#ffffff',
    });
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('My Cool App');
    expect(parsed.short_name).toBe('My Cool App');
    expect(parsed.display).toBe('standalone');
    expect(parsed.icons).toHaveLength(2);
    expect(parsed.icons[0].src).toBe('/icon-192.svg');
  });

  it('uses iconUrl when provided in manifest', () => {
    const json = buildManifest('App', {
      themeColor: '#000',
      backgroundColor: '#000',
      iconUrl: 'https://cdn.example.com/icon.png',
    });
    const parsed = JSON.parse(json);
    expect(parsed.icons[0].src).toBe('https://cdn.example.com/icon.png');
    expect(parsed.icons[0].type).toBe('image/png');
  });

  it('builds a valid SVG icon containing initials', () => {
    const svg = buildPlaceholderIconSvg('Nexa Pos', 192, '#0a0b10');
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="192"');
    expect(svg).toContain('NP');
  });

  it('patches index.html and is idempotent', () => {
    const html = baseFiles[0].content;
    const once = patchIndexHtml(html, '#0a0b10', '/icon-192.svg');
    expect(once).toContain('rel="manifest"');
    expect(once).toContain('href="/manifest.webmanifest"');

    // Re-run: no duplicate manifest tags
    const twice = patchIndexHtml(once, '#0a0b10', '/icon-192.svg');
    const matches = twice.match(/rel=["']manifest["']/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('detects PWA-active projects', () => {
    expect(isPwaActive(baseFiles)).toBe(false);
    const result = activatePwa(baseFiles, 'Demo');
    expect(isPwaActive(result.files)).toBe(true);
  });

  it('activatePwa creates manifest, icons and patches index', () => {
    const result = activatePwa(baseFiles, 'Demo');
    const paths = result.files.map((f) => f.path).sort();
    expect(paths).toContain('public/manifest.webmanifest');
    expect(paths).toContain('public/icon-192.svg');
    expect(paths).toContain('public/icon-512.svg');
    expect(paths).toContain('index.html');
    expect(result.alreadyActive).toBe(false);
    expect(result.changed.length).toBeGreaterThan(0);
  });

  it('skips SVG placeholder when iconUrl is provided', () => {
    const result = activatePwa(baseFiles, 'Demo', { iconUrl: 'https://x/icon.png' });
    const paths = result.files.map((f) => f.path);
    expect(paths).not.toContain('public/icon-192.svg');
    expect(paths).not.toContain('public/icon-512.svg');
    expect(paths).toContain('public/manifest.webmanifest');
    const manifest = result.files.find((f) => f.path === 'public/manifest.webmanifest')!;
    expect(manifest.content).toContain('https://x/icon.png');
  });

  it('creates a minimal index.html if missing', () => {
    const result = activatePwa([baseFiles[1]], 'Demo');
    const index = result.files.find((f) => f.path === 'index.html');
    expect(index).toBeDefined();
    expect(index!.content).toContain('rel="manifest"');
    expect(index!.content).toContain('id="root"');
  });

  it('marks alreadyActive=true on second run', () => {
    const first = activatePwa(baseFiles, 'Demo');
    const second = activatePwa(first.files, 'Demo');
    expect(second.alreadyActive).toBe(true);
  });
});