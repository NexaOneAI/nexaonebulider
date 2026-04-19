/**
 * Deploy a Netlify usando el File Digest API.
 *
 * Flujo:
 *  1. Construye un index.html minimalista con Vite-like loader (CDN React)
 *     porque no tenemos un builder real en Deno; alternativa: subir los
 *     archivos fuente y un public/index.html con Tailwind CDN.
 *  2. Hashea cada archivo con SHA1.
 *  3. Crea (o reutiliza) un site en Netlify.
 *  4. POST /sites/:id/deploys con el digest → Netlify devuelve qué hashes
 *     necesita.
 *  5. PUT cada archivo faltante a /deploys/:id/files/:path.
 *  6. Espera a que el deploy esté ready y devuelve la URL.
 */
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface FileInput {
  path: string;
  content: string;
}

interface DeployBody {
  projectId: string;
  projectName: string;
  files: FileInput[];
  siteId?: string;
}

const NETLIFY_API = 'https://api.netlify.com/api/v1';

async function sha1(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const buf = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Convierte archivos del builder en un sitio estático listo para Netlify. */
function buildStaticSite(files: FileInput[]): Map<string, string> {
  const site = new Map<string, string>();

  // Si el usuario ya tiene un index.html, lo respetamos
  const userHtml = files.find(
    (f) => f.path === 'index.html' || f.path === 'public/index.html',
  );

  // Recolectar TSX/JSX/CSS para servir como módulos in-browser via esbuild-wasm CDN.
  // Usamos un loader cliente que monta App.tsx vía Sucrase + esm.sh, igual que
  // hace el preview iframe del builder. Esto evita necesitar un build server.
  const sourceFiles: FileInput[] = files.filter((f) =>
    /\.(tsx|jsx|ts|js|css|json|svg|png|jpg|webp|woff2?)$/i.test(f.path),
  );

  // Embebemos los fuentes como JSON dentro del HTML para que el loader
  // del cliente los compile en runtime. Tamaño OK para apps pequeñas.
  const filesJson = JSON.stringify(
    sourceFiles.map((f) => ({ path: f.path, content: f.content })),
  );

  const html = userHtml?.content ?? `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>body{font-family:'Inter',system-ui,sans-serif;margin:0;background:#0a0a0a;color:#fff}</style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import { transform } from 'https://esm.sh/sucrase@3.34.0?bundle';
    const FILES = ${filesJson};
    const fileMap = new Map(FILES.map(f => [f.path.startsWith('/') ? f.path : '/' + f.path, f.content]));
    const moduleCache = new Map();
    function resolve(spec, importer) {
      if (spec.startsWith('http')) return spec;
      if (spec.startsWith('@/')) spec = '/src/' + spec.slice(2);
      if (spec.startsWith('./') || spec.startsWith('../')) {
        const base = importer.slice(0, importer.lastIndexOf('/'));
        const parts = (base + '/' + spec).split('/');
        const stack = [];
        for (const p of parts) { if (p === '..') stack.pop(); else if (p && p !== '.') stack.push(p); }
        spec = '/' + stack.join('/');
      }
      // try extensions
      for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts']) {
        if (fileMap.has(spec + ext)) return spec + ext;
      }
      return 'https://esm.sh/' + spec.replace(/^\\//, '') + '?bundle&deps=react@18.3.1,react-dom@18.3.1';
    }
    async function load(path) {
      if (moduleCache.has(path)) return moduleCache.get(path);
      if (path.startsWith('http')) {
        const m = await import(path);
        moduleCache.set(path, m);
        return m;
      }
      let code = fileMap.get(path) || '';
      if (path.endsWith('.css')) {
        const style = document.createElement('style');
        style.textContent = code;
        document.head.appendChild(style);
        moduleCache.set(path, {});
        return {};
      }
      // Replace bare imports with resolved URLs/paths recursively via blob
      const compiled = transform(code, { transforms: ['typescript', 'jsx', 'imports'] }).code;
      const blob = new Blob([compiled], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const mod = await import(url);
      moduleCache.set(path, mod);
      return mod;
    }
    (async () => {
      try {
        const React = await import('https://esm.sh/react@18.3.1');
        const ReactDOM = await import('https://esm.sh/react-dom@18.3.1/client');
        const App = await load('/src/App.tsx');
        ReactDOM.createRoot(document.getElementById('root')).render(
          React.createElement(React.StrictMode, null, React.createElement(App.default))
        );
      } catch (e) {
        document.getElementById('root').innerHTML = '<pre style="padding:20px;color:#f00;white-space:pre-wrap">' + (e?.message || String(e)) + '</pre>';
        console.error(e);
      }
    })();
  </script>
</body>
</html>`;

  site.set('index.html', html);

  // Netlify SPA fallback
  site.set('_redirects', '/*  /index.html  200');

  return site;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const NETLIFY_TOKEN = Deno.env.get('NETLIFY_AUTH_TOKEN');
    if (!NETLIFY_TOKEN) {
      return new Response(
        JSON.stringify({
          error:
            'Falta NETLIFY_AUTH_TOKEN en los secretos. Pide al chat "conecta Netlify" o configúralo en backend.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as DeployBody;
    if (!body?.projectId || !Array.isArray(body.files)) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Crear registro pending
    const { data: deployment } = await supabase
      .from('project_deployments')
      .insert({
        project_id: body.projectId,
        user_id: user.id,
        provider: 'netlify',
        status: 'building',
        site_id: body.siteId ?? null,
      })
      .select()
      .single();

    const updateDeployment = async (patch: Record<string, unknown>) => {
      if (!deployment) return;
      await supabase.from('project_deployments').update(patch).eq('id', deployment.id);
    };

    try {
      // 1. Asegurar site
      let siteId = body.siteId;
      if (!siteId) {
        const safeName =
          body.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30) +
          '-' + crypto.randomUUID().slice(0, 6);
        const siteRes = await fetch(`${NETLIFY_API}/sites`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${NETLIFY_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: safeName }),
        });
        if (!siteRes.ok) {
          const t = await siteRes.text();
          throw new Error(`Netlify site create failed [${siteRes.status}]: ${t}`);
        }
        const siteJson = await siteRes.json();
        siteId = siteJson.id as string;
      }

      // 2. Construir sitio estático y hash de archivos
      const siteFiles = buildStaticSite(body.files);
      const fileDigests: Record<string, string> = {};
      for (const [path, content] of siteFiles) {
        fileDigests['/' + path] = await sha1(content);
      }

      // 3. Crear deploy con digest
      const deployRes = await fetch(`${NETLIFY_API}/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: fileDigests }),
      });
      if (!deployRes.ok) {
        const t = await deployRes.text();
        throw new Error(`Netlify deploy create failed [${deployRes.status}]: ${t}`);
      }
      const deployJson = await deployRes.json();
      const deployId = deployJson.id as string;
      const required: string[] = deployJson.required ?? [];

      // 4. Subir archivos faltantes
      for (const [path, content] of siteFiles) {
        const sha = fileDigests['/' + path];
        if (!required.includes(sha)) continue;
        const upRes = await fetch(`${NETLIFY_API}/deploys/${deployId}/files/${path}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${NETLIFY_TOKEN}`,
            'Content-Type': 'application/octet-stream',
          },
          body: content,
        });
        if (!upRes.ok) {
          const t = await upRes.text();
          throw new Error(`Upload ${path} failed [${upRes.status}]: ${t}`);
        }
      }

      // 5. Poll hasta ready (max ~30s)
      let liveUrl: string | null = deployJson.deploy_ssl_url ?? deployJson.url ?? null;
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const statusRes = await fetch(`${NETLIFY_API}/deploys/${deployId}`, {
          headers: { Authorization: `Bearer ${NETLIFY_TOKEN}` },
        });
        const status = await statusRes.json();
        if (status.state === 'ready') {
          liveUrl = status.deploy_ssl_url || status.url || liveUrl;
          break;
        }
        if (status.state === 'error') {
          throw new Error(`Netlify build error: ${status.error_message ?? 'unknown'}`);
        }
      }

      await updateDeployment({ status: 'live', url: liveUrl, site_id: siteId });

      return new Response(
        JSON.stringify({
          deploymentId: deployment?.id,
          url: liveUrl,
          siteId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await updateDeployment({ status: 'failed', error_message: msg });
      throw err;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('deploy-netlify error', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
