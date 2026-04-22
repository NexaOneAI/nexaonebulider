# Project Memory

## Core
Nexa One Builder — AI App Builder SaaS. Dark premium theme.
Primary hsl(200 90% 48%), accent hsl(260 70% 58%), bg hsl(220 20% 4%).
Inter display + JetBrains Mono code. Spanish UI language.
Supabase backend via Lovable Cloud. Zustand for state.
Roles in separate user_roles table, never on profiles.
Professional folder structure: features/, components/, hooks/, lib/, app/.
Builder standard: archivos REALES persistidos en project_versions, sin warnings, sugerencias accionables, listo Netlify. Validar siempre antes de responder.

## Memories
- [Design tokens](mem://design/tokens) — Full dark theme palette, gradients, shadows, glass utility
- [Architecture](mem://features/structure) — features/{auth,projects,builder,ai,credits,billing,admin}, components/{layout,builder,ui}, hooks/, lib/, app/
- [Credit system](mem://features/credits) — Cost tiers: simple=2, edit=3, medium=5, complex=8, full=12. Packages: 50/150/500/2000 credits. Backend validation + rollback.
- [AI providers](mem://features/ai-providers) — Decoupled multi-provider: lovable.ts, openai.ts, gemini.ts, custom.ts. Smart router with fallback. Edge functions: generate-app (with credits+versioning), estimate-cost, admin-actions.
- [Builder standard](mem://preferences/builder-standard) — 9 reglas de calidad permanentes para cada generación: archivos reales, sin warnings, contextual quick-actions, deploy-ready Netlify
