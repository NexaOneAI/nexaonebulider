import { describe, it, expect } from 'vitest';
import { getQuickActions, detectAppKind } from './contextualActions';
import type { GeneratedFile } from '@/features/projects/projectTypes';

const mk = (path: string, content = ''): GeneratedFile => ({ path, content });

describe('contextualActions — dynamic suggestions per project type', () => {
  it('LANDING: detects landing and surfaces hero/pricing/testimonials/CTA', () => {
    const files = [
      mk('src/pages/Index.tsx', 'hero pricing testimonials cta lead magnet'),
      mk('src/components/Hero.tsx', 'hero section'),
      mk('src/components/Pricing.tsx', 'pricing plans'),
    ];
    const kind = detectAppKind('Mi Landing Startup', files, {
      lastUserPrompt: 'crea una landing con hero pricing y testimonios',
    });
    const { actions } = getQuickActions('Mi Landing Startup', files, {
      lastUserPrompt: 'crea una landing con hero pricing y testimonios',
    });
    const ids = actions.map((a) => a.id);
    expect(kind).toBe('landing');
    expect(ids).toEqual(expect.arrayContaining(['cta-section', 'pricing', 'testimonials']));
    // Should NOT contain POS/SaaS-only actions
    expect(ids).not.toContain('workspaces');
    expect(ids).not.toContain('sales-history');
  });

  it('POS: detects POS and surfaces cart/sales-history; filters out inventory once present', () => {
    const files = [
      mk('src/pages/Pos.tsx', 'punto de venta carrito checkout caja venta'),
      mk('src/components/Cart.tsx', 'carrito addtocart checkout'),
      mk('src/features/inventory/inv.ts', 'inventario stock'),
    ];
    const kind = detectAppKind('POS Tienda', files, {
      lastUserPrompt: 'agrega inventario y carrito al punto de venta',
    });
    const { actions, signals } = getQuickActions('POS Tienda', files, {
      lastUserPrompt: 'agrega inventario y carrito al punto de venta',
    });
    const ids = actions.map((a) => a.id);
    expect(kind).toBe('pos');
    expect(signals.hasCart).toBe(true);
    expect(signals.hasInventory).toBe(true);
    expect(ids).toEqual(expect.arrayContaining(['cart', 'sales-history']));
    // Inventory action is filtered because hasInventory=true
    expect(ids).not.toContain('inventory');
    // No landing-only actions
    expect(ids).not.toContain('cta-section');
  });

  it('SAAS: detects saas and surfaces workspaces/billing/saas-dashboard', () => {
    const files = [
      mk('src/pages/Dashboard.tsx', 'saas workspace tenants subscription plan multi-tenant'),
      mk('src/features/workspace/ws.ts', 'workspace tenants suscripcion'),
      mk('src/pages/Billing.tsx', 'subscription plan billing'),
    ];
    const kind = detectAppKind('Mi SaaS Workspace', files, {
      lastUserPrompt: 'es un saas multi-tenant con suscripciones',
    });
    const { actions } = getQuickActions('Mi SaaS Workspace', files, {
      lastUserPrompt: 'es un saas multi-tenant con suscripciones',
    });
    const ids = actions.map((a) => a.id);
    expect(kind).toBe('saas');
    expect(ids).toEqual(expect.arrayContaining(['workspaces', 'billing', 'saas-dashboard']));
    // No POS/landing-only actions
    expect(ids).not.toContain('cart');
    expect(ids).not.toContain('cta-section');
  });

  it('REACTIVITY: changing the project changes the suggestion set', () => {
    const landing = getQuickActions(
      'Landing',
      [mk('src/pages/Index.tsx', 'hero pricing testimonials cta')],
      { lastUserPrompt: 'landing con hero y pricing' },
    ).actions.map((a) => a.id);
    const pos = getQuickActions(
      'POS',
      [mk('src/pages/Pos.tsx', 'punto de venta carrito checkout caja')],
      { lastUserPrompt: 'punto de venta con carrito' },
    ).actions.map((a) => a.id);
    expect(landing).not.toEqual(pos);
  });

  it('PROGRESS: once auth + supabase exist, those base actions disappear', () => {
    const filesEarly = [mk('src/pages/Index.tsx', 'hero')];
    const earlyIds = getQuickActions('App', filesEarly).actions.map((a) => a.id);
    expect(earlyIds).toContain('auth');
    expect(earlyIds).toContain('database');

    const filesMature = [
      mk('src/pages/Index.tsx', 'hero'),
      mk('src/lib/auth.ts', 'supabase.auth.signInWithPassword authprovider'),
      mk('src/integrations/supabase/client.ts', '@supabase/supabase-js createClient( supabase.from('),
    ];
    const matureIds = getQuickActions('App', filesMature).actions.map((a) => a.id);
    expect(matureIds).not.toContain('auth');
    expect(matureIds).not.toContain('database');
  });
});