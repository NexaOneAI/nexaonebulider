# Nexa One Builder

> **AI-Powered App Builder** — Crea aplicaciones completas con inteligencia artificial.

Escribe un prompt, genera tu app, edítala por chat, previsualízala en vivo, expórtala en ZIP y despliégala.

## Stack

- **Frontend:** React 18 + Vite 5 + TypeScript 5 + Tailwind CSS 3
- **State:** Zustand
- **Backend:** Supabase (Auth, Database, Edge Functions, Storage)
- **Export:** JSZip
- **Deploy:** Netlify-ready

## Arquitectura

```
src/
  app/           → Router, providers, store barrel
  pages/         → Landing, Login, Dashboard, Builder, Billing, Admin, etc.
  components/
    layout/      → AppShell, Topbar, Sidebar
    builder/     → ChatPanel, PreviewPanel, FileTree, CodeEditor, etc.
    ui/          → Loader, EmptyState, shadcn components
  features/
    auth/        → authService, authStore, guards, types
    projects/    → projectsService, projectsStore, projectTypes
    builder/     → builderStore, builderService, parser, preview, zipExport
    ai/          → aiService, aiRouter, providers/ (openai, claude, gemini, custom)
    credits/     → creditsService, creditsStore, creditsTypes
    billing/     → billingService, billingTypes
    admin/       → adminService, adminTypes
  hooks/         → useAuth, useProjects, useBuilder, useCredits
  lib/           → constants, utils, validators, errors
  integrations/  → Supabase client & types
  styles/        → globals.css
```

## Inicio rápido

```bash
npm install
cp .env.example .env
npm run dev
```

## Variables de entorno

Ver `.env.example` para la lista completa.

## Rutas

| Ruta                 | Descripción          | Acceso       |
|----------------------|----------------------|--------------|
| `/`                  | Landing page         | Público      |
| `/login`             | Inicio de sesión     | Público      |
| `/register`          | Registro             | Público      |
| `/dashboard`         | Panel del usuario    | Autenticado  |
| `/builder/:projectId`| Builder principal    | Autenticado  |
| `/billing`           | Créditos y pagos     | Autenticado  |
| `/admin`             | Panel de admin       | Admin        |

## Licencia

Privado — Todos los derechos reservados.
