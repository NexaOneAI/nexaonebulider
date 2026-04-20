/**
 * Client-side mirror of `supabase/functions/_shared/projectScaffold.ts`.
 * Used by the WebContainer runtime to build a fully-runnable Vite project
 * in the browser without a server round-trip.
 *
 * The output of `buildScaffoldFiles` is the user's generated files PLUS
 * any scaffold files that are missing (package.json, vite.config, etc.).
 */
import type { GeneratedFile } from '@/features/projects/projectTypes';

export function buildScaffoldFiles(
  projectName: string,
  userFiles: GeneratedFile[],
): { path: string; content: string }[] {
  const slug = slugify(projectName || 'mi-proyecto');
  const present = new Set(userFiles.map((f) => f.path));
  const out: { path: string; content: string }[] = [];

  const add = (path: string, content: string) => {
    if (!present.has(path)) out.push({ path, content });
  };

  add('package.json', JSON.stringify(buildPackageJson(slug), null, 2));
  add('vite.config.ts', VITE_CONFIG);
  add('tsconfig.json', JSON.stringify(TSCONFIG, null, 2));
  add('tsconfig.node.json', JSON.stringify(TSCONFIG_NODE, null, 2));
  add('tailwind.config.ts', TAILWIND_CONFIG);
  add('postcss.config.js', POSTCSS_CONFIG);
  add('index.html', buildIndexHtml(projectName || 'App'));
  add('src/index.css', INDEX_CSS);

  // User files always come last so they win conflicts
  for (const f of userFiles) out.push({ path: f.path, content: f.content });
  return out;
}

function slugify(s: string): string {
  return (
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'app'
  );
}

function buildPackageJson(slug: string) {
  return {
    name: slug,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.3.0',
      'react-dom': '^18.3.0',
    },
    devDependencies: {
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      '@vitejs/plugin-react': '^4.3.0',
      autoprefixer: '^10.4.0',
      postcss: '^8.4.0',
      tailwindcss: '^3.4.0',
      typescript: '^5.5.0',
      vite: '^5.4.0',
    },
  };
}

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
});
`;

const TSCONFIG = {
  compilerOptions: {
    target: 'ES2020',
    useDefineForClassFields: true,
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    skipLibCheck: true,
    moduleResolution: 'bundler',
    allowImportingTsExtensions: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: 'react-jsx',
    strict: false,
  },
  include: ['src'],
  references: [{ path: './tsconfig.node.json' }],
};

const TSCONFIG_NODE = {
  compilerOptions: {
    composite: true,
    skipLibCheck: true,
    module: 'ESNext',
    moduleResolution: 'bundler',
    allowSyntheticDefaultImports: true,
  },
  include: ['vite.config.ts'],
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