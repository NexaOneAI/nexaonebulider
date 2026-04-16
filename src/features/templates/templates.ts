import type { GeneratedFile } from '@/features/projects/projectTypes';

export interface Template {
  id: 'landing' | 'dashboard' | 'ecommerce' | 'blog';
  name: string;
  description: string;
  emoji: string;
  tags: string[];
  files: GeneratedFile[];
  previewCode: string;
}

// Shared minimal HTML wrapper used for the live preview iframe.
const html = (title: string, body: string, styles = '') => `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>${styles}</style></head>
<body class="bg-slate-950 text-slate-100 antialiased">${body}</body></html>`;

// ---------------- LANDING ----------------
const landingPreview = html(
  'Landing — SaaS',
  `
  <header class="border-b border-slate-800/60 backdrop-blur sticky top-0 z-10">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-2 font-bold"><span class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500"></span> Acme</div>
      <nav class="hidden md:flex gap-8 text-sm text-slate-400">
        <a class="hover:text-white">Producto</a><a class="hover:text-white">Precios</a><a class="hover:text-white">Blog</a>
      </nav>
      <button class="px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-semibold">Empezar</button>
    </div>
  </header>
  <section class="max-w-6xl mx-auto px-6 py-24 text-center">
    <span class="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs">Nuevo · v2.0</span>
    <h1 class="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight">Lanza tu producto<br/><span class="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">10x más rápido</span></h1>
    <p class="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">La plataforma todo-en-uno para construir, lanzar y escalar tu SaaS sin escribir backend.</p>
    <div class="mt-8 flex gap-3 justify-center">
      <button class="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 font-semibold">Probar gratis</button>
      <button class="px-6 py-3 rounded-lg border border-slate-700">Ver demo</button>
    </div>
  </section>
  <section class="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
    ${['Velocidad','Escalabilidad','Seguridad'].map((t,i)=>`
    <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
      <div class="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-4">⚡</div>
      <h3 class="font-semibold">${t}</h3>
      <p class="mt-2 text-sm text-slate-400">Construido para equipos modernos que necesitan resultados desde el día uno.</p>
    </div>`).join('')}
  </section>
  <footer class="border-t border-slate-800 py-8 text-center text-sm text-slate-500">© 2025 Acme · Hecho con Nexa One</footer>
  `,
);

// ---------------- DASHBOARD ----------------
const dashboardPreview = html(
  'Dashboard',
  `
  <div class="flex h-screen">
    <aside class="w-60 border-r border-slate-800 p-4 hidden md:block">
      <div class="font-bold mb-6">📊 Admin</div>
      <nav class="space-y-1 text-sm">
        ${['Inicio','Ventas','Clientes','Productos','Reportes','Ajustes'].map((n,i)=>`<a class="block px-3 py-2 rounded-lg ${i===0?'bg-slate-800':'hover:bg-slate-900 text-slate-400'}">${n}</a>`).join('')}
      </nav>
    </aside>
    <main class="flex-1 overflow-auto">
      <header class="h-14 border-b border-slate-800 px-6 flex items-center justify-between">
        <h1 class="font-semibold">Inicio</h1>
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500"></div>
      </header>
      <div class="p-6 space-y-6">
        <div class="grid md:grid-cols-4 gap-4">
          ${[['Ingresos','$24,580','+12%'],['Pedidos','1,420','+5%'],['Clientes','892','+18%'],['Conversión','3.4%','-0.2%']].map(([l,v,d])=>`
          <div class="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <p class="text-sm text-slate-400">${l}</p>
            <p class="mt-1 text-2xl font-bold">${v}</p>
            <p class="mt-1 text-xs ${(d as string).startsWith('-')?'text-red-400':'text-emerald-400'}">${d}</p>
          </div>`).join('')}
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="md:col-span-2 p-6 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 class="font-semibold mb-4">Ventas últimos 7 días</h3>
            <div class="h-48 flex items-end gap-2">
              ${[40,65,50,80,72,90,68].map(h=>`<div class="flex-1 bg-gradient-to-t from-indigo-500 to-fuchsia-500 rounded-t" style="height:${h}%"></div>`).join('')}
            </div>
          </div>
          <div class="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 class="font-semibold mb-4">Top productos</h3>
            <ul class="space-y-3 text-sm">
              ${['Camiseta Pro','Hoodie 2025','Gorra Negra','Sticker pack'].map((p,i)=>`<li class="flex justify-between"><span>${p}</span><span class="text-slate-400">${(120-i*22)}</span></li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    </main>
  </div>
  `,
);

// ---------------- ECOMMERCE ----------------
const ecommercePreview = html(
  'Tienda',
  `
  <header class="border-b border-slate-800 px-6 h-16 flex items-center justify-between">
    <div class="font-bold">🛍️ Maison</div>
    <input class="hidden md:block w-80 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm" placeholder="Buscar productos..."/>
    <div class="flex gap-3 text-sm"><button>Cuenta</button><button class="relative">🛒 <span class="absolute -top-2 -right-2 bg-fuchsia-500 text-xs rounded-full w-4 h-4 flex items-center justify-center">3</span></button></div>
  </header>
  <section class="max-w-7xl mx-auto px-6 py-10">
    <h1 class="text-3xl font-bold mb-2">Nueva colección Otoño</h1>
    <p class="text-slate-400 mb-8">Piezas únicas hechas a mano</p>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      ${[['Suéter Beige','$1,290'],['Abrigo Largo','$2,450'],['Botines Café','$1,890'],['Bufanda Lana','$590'],['Pantalón Wide','$1,150'],['Camisa Oversize','$890'],['Gorra Tweed','$450'],['Bolso Tote','$1,690']].map(([n,p])=>`
      <div class="group cursor-pointer">
        <div class="aspect-square rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 mb-3 group-hover:scale-[1.02] transition"></div>
        <h3 class="font-medium text-sm">${n}</h3>
        <p class="text-sm text-slate-400">${p}</p>
      </div>`).join('')}
    </div>
  </section>
  <footer class="border-t border-slate-800 mt-12 py-8 text-center text-sm text-slate-500">© 2025 Maison · Envíos a toda la república</footer>
  `,
);

// ---------------- BLOG ----------------
const blogPreview = html(
  'Blog',
  `
  <header class="border-b border-slate-800 py-6 text-center">
    <div class="font-bold text-2xl">📝 Mente Curiosa</div>
    <p class="text-slate-400 text-sm mt-1">Ensayos sobre tecnología, diseño y producto</p>
  </header>
  <main class="max-w-3xl mx-auto px-6 py-12 space-y-10">
    ${[
      ['Por qué la simplicidad gana','Reflexiones sobre cómo los productos minimalistas terminan dominando mercados saturados.','12 abr 2025','5 min'],
      ['El arte del onboarding','Una guía práctica para diseñar primeras experiencias memorables que conviertan.','5 abr 2025','8 min'],
      ['Diseñar para la atención','En la era del scroll infinito, capturar 3 segundos vale más que 30 minutos.','28 mar 2025','6 min'],
      ['IA y el futuro del software','¿Estamos viviendo el momento más importante del software desde la web?','20 mar 2025','10 min'],
    ].map(([t,d,date,read])=>`
    <article class="border-b border-slate-800 pb-10">
      <p class="text-xs text-slate-500 mb-2">${date} · ${read} lectura</p>
      <h2 class="text-2xl font-bold hover:text-indigo-400 cursor-pointer">${t}</h2>
      <p class="mt-3 text-slate-400">${d}</p>
      <a class="mt-3 inline-block text-indigo-400 text-sm hover:underline cursor-pointer">Leer más →</a>
    </article>`).join('')}
  </main>
  <footer class="border-t border-slate-800 py-8 text-center text-sm text-slate-500">© 2025 Mente Curiosa · Suscríbete al newsletter</footer>
  `,
);

const fileFromHtml = (path: string, content: string): GeneratedFile => ({
  path,
  content,
  language: 'html',
});

export const TEMPLATES: Template[] = [
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Página de aterrizaje moderna para SaaS o producto digital con hero, features y CTA.',
    emoji: '🚀',
    tags: ['Marketing', 'SaaS', 'Hero'],
    files: [fileFromHtml('index.html', landingPreview)],
    previewCode: landingPreview,
  },
  {
    id: 'dashboard',
    name: 'Dashboard Admin',
    description: 'Panel de administración con sidebar, KPIs, gráficos y tablas. Ideal para apps internas.',
    emoji: '📊',
    tags: ['Admin', 'Analytics', 'Internal'],
    files: [fileFromHtml('index.html', dashboardPreview)],
    previewCode: dashboardPreview,
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Tienda online con catálogo de productos, búsqueda, carrito y diseño elegante.',
    emoji: '🛍️',
    tags: ['Tienda', 'Productos', 'Carrito'],
    files: [fileFromHtml('index.html', ecommercePreview)],
    previewCode: ecommercePreview,
  },
  {
    id: 'blog',
    name: 'Blog Editorial',
    description: 'Blog minimalista enfocado en lectura, con listado de artículos y tipografía cuidada.',
    emoji: '📝',
    tags: ['Contenido', 'Lectura', 'Minimal'],
    files: [fileFromHtml('index.html', blogPreview)],
    previewCode: blogPreview,
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
