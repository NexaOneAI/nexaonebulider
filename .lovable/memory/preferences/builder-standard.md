---
name: builder-standard
description: Estándar permanente del builder Nexa One — 9 reglas de calidad para cada generación
type: preference
---

# Estándar de Generación — Nexa One Builder

Aplica SIEMPRE que el builder genere o edite código de un proyecto del usuario.

1. **Generación real**: archivos visibles en FileTree (index.html, App.tsx, main.tsx, css). Nunca solo preview temporal. Todo persistido en `project_versions`.
2. **Sin errores**: no entregar bloques fallidos ni warnings de consola. Si la generación falla un bloque, reintentar antes de responder.
3. **Stack**: React + Vite + TypeScript. Código modular (componentes/lógica separados).
4. **UX completa**: responsive, estados loading/empty/error, navegación clara.
5. **Funcionalidad real**: carrito/auth/DB deben funcionar de verdad. Si requiere backend, configurarlo.
6. **Persistencia**: cada cambio en `project_versions`. Recargar (F5) no debe perder archivos.
7. **Sugerencias accionables**: detectar tipo (POS/SaaS/landing/CRM/etc) y mostrar QuickActions reales (ya implementado en QuickActionsBar.tsx + contextualActions.ts).
8. **Producción**: incluir SPA fallback (`public/_redirects` + `netlify.toml`), build válido, listo para Netlify.
9. **Validación final**: confirmar app corre, archivos existen, preview funciona.

**Why:** El usuario quiere un builder real (no demo). Esta es la barra de calidad permanente.

**How to apply:** Cuando el usuario pida una generación o edición, no agregar features que no se persistan, no entregar respuestas con bloques fallidos sin avisar, validar al final.
