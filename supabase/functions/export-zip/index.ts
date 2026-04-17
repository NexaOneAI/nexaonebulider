import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore — JSZip via esm
import JSZip from "https://esm.sh/jszip@3.10.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser, getAdminClient } from "../_shared/auth.ts";

/**
 * export-zip: Server-side ZIP generation. Builds a complete Vite+React+TS project,
 * uploads to app-exports bucket, returns a signed URL.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, projectName, files } = await req.json();
    if (!Array.isArray(files) || files.length === 0) {
      return jsonResponse({ error: "files es requerido" }, 400);
    }

    const { user, error: authError } = await requireUser(req);
    if (authError || !user) return jsonResponse({ error: authError }, 401);

    const admin = getAdminClient();
    const slug = slugify(projectName || "mi-proyecto");

    // Build ZIP
    const zip = new JSZip();
    for (const f of files) {
      zip.file(f.path, f.content);
    }

    // Inject standard project scaffold (skip if already present)
    const present = new Set(files.map((f: any) => f.path));

    if (!present.has("package.json")) {
      zip.file("package.json", JSON.stringify(buildPackageJson(slug), null, 2));
    }
    if (!present.has("vite.config.ts")) zip.file("vite.config.ts", VITE_CONFIG);
    if (!present.has("tsconfig.json")) zip.file("tsconfig.json", JSON.stringify(TSCONFIG, null, 2));
    if (!present.has("tsconfig.node.json")) zip.file("tsconfig.node.json", JSON.stringify(TSCONFIG_NODE, null, 2));
    if (!present.has("tailwind.config.ts")) zip.file("tailwind.config.ts", TAILWIND_CONFIG);
    if (!present.has("postcss.config.js")) zip.file("postcss.config.js", POSTCSS_CONFIG);
    if (!present.has("index.html")) zip.file("index.html", buildIndexHtml(projectName || "App"));
    if (!present.has("src/index.css")) zip.file("src/index.css", INDEX_CSS);
    if (!present.has(".gitignore")) zip.file(".gitignore", GITIGNORE);
    if (!present.has("README.md")) zip.file("README.md", buildReadme(projectName || slug));

    const buf: Uint8Array = await zip.generateAsync({ type: "uint8array" });

    // Upload to storage: <user_id>/<projectId>-<timestamp>.zip
    const ts = Date.now();
    const storagePath = `${user.id}/${projectId || "unsaved"}-${ts}.zip`;

    const { error: uploadError } = await admin.storage
      .from("app-exports")
      .upload(storagePath, buf, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      console.error("upload error:", uploadError);
      return jsonResponse({ error: "Error subiendo ZIP" }, 500);
    }

    // Signed URL valid for 1 hour
    const { data: signed } = await admin.storage
      .from("app-exports")
      .createSignedUrl(storagePath, 3600);

    if (!signed?.signedUrl) {
      return jsonResponse({ error: "Error generando URL firmada" }, 500);
    }

    // Record export
    if (projectId) {
      await admin.from("app_exports").insert({
        project_id: projectId,
        user_id: user.id,
        export_type: "zip",
        zip_url: storagePath,
      });
    }

    return jsonResponse({
      success: true,
      url: signed.signedUrl,
      path: storagePath,
      sizeBytes: buf.length,
      fileCount: files.length,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("export-zip error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50) || "app";
}

function buildPackageJson(slug: string) {
  return {
    name: slug,
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
      preview: "vite preview",
    },
    dependencies: {
      react: "^18.3.0",
      "react-dom": "^18.3.0",
    },
    devDependencies: {
      "@types/react": "^18.3.0",
      "@types/react-dom": "^18.3.0",
      "@vitejs/plugin-react": "^4.3.0",
      autoprefixer: "^10.4.0",
      postcss: "^8.4.0",
      tailwindcss: "^3.4.0",
      typescript: "^5.5.0",
      vite: "^5.4.0",
    },
  };
}

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
`;

const TSCONFIG = {
  compilerOptions: {
    target: "ES2020",
    useDefineForClassFields: true,
    lib: ["ES2020", "DOM", "DOM.Iterable"],
    module: "ESNext",
    skipLibCheck: true,
    moduleResolution: "bundler",
    allowImportingTsExtensions: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: "react-jsx",
    strict: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noFallthroughCasesInSwitch: true,
  },
  include: ["src"],
  references: [{ path: "./tsconfig.node.json" }],
};

const TSCONFIG_NODE = {
  compilerOptions: {
    composite: true,
    skipLibCheck: true,
    module: "ESNext",
    moduleResolution: "bundler",
    allowSyntheticDefaultImports: true,
    strict: true,
  },
  include: ["vite.config.ts"],
};

const TAILWIND_CONFIG = `import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
`;

const POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

const INDEX_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

const GITIGNORE = `node_modules
dist
dist-ssr
*.local
.env
.env.local
.DS_Store
`;

function buildIndexHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
`;
}

function buildReadme(name: string): string {
  return `# ${name}

Generado con [Nexa One Builder](https://nexa.one).

## Requisitos

- Node.js 18 o superior
- npm, pnpm o bun

## Instalación

\`\`\`bash
npm install
\`\`\`

## Desarrollo

\`\`\`bash
npm run dev
\`\`\`

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

## Build

\`\`\`bash
npm run build
\`\`\`

Los archivos compilados se generan en \`dist/\`.

## Deploy

### Vercel (recomendado)

1. Sube este proyecto a un repositorio de GitHub
2. Importa el repo en [vercel.com/new](https://vercel.com/new)
3. Vercel detecta Vite automáticamente — clic en **Deploy**

### Netlify

1. \`npm run build\`
2. Arrastra la carpeta \`dist/\` a [app.netlify.com/drop](https://app.netlify.com/drop)

O conecta tu repo en Netlify, build command: \`npm run build\`, publish: \`dist\`.

### Cloudflare Pages

\`\`\`bash
npm install -g wrangler
npm run build
wrangler pages deploy dist
\`\`\`

## Estructura

\`\`\`
src/
  App.tsx       # Componente raíz
  main.tsx      # Punto de entrada
  index.css     # Estilos globales (Tailwind)
\`\`\`

---

🚀 Generado el ${new Date().toISOString().split("T")[0]} con Nexa One Builder.
`;
}
