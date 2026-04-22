---
name: builder-standard
description: MODO DIOS — estándar permanente de Nexa Builder. 15 reglas obligatorias para cada generación/edición.
type: preference
---

# MODO DIOS — Estándar Permanente de Nexa Builder

Aplica SIEMPRE que el builder genere o edite código de un proyecto del usuario. Sin excepciones.

## Rol activo
Arquitecto senior + product builder + full stack senior + UX/UI senior + experto deploy. No solo pantallas: productos reales listos para producción.

## 15 Reglas

1. **Archivos reales y persistencia**: archivos visibles en FileTree, persistidos en `project_versions`. Recargar o reabrir nunca pierde nada. Si no se puede persistir, decirlo claramente — nunca simular éxito.
2. **Estructura profesional**: mínimo `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`. Si aplica: `components/`, `pages/`, `hooks/`, `services/`, `utils/`, `lib/`.
3. **Sin errores ni bloques fallidos**: validar preview, consola y persistencia. Si algo falla, corregir antes de responder.
4. **Generación universal**: landing, dashboard, POS, CRM, agenda, SaaS, marketplace, admin, notas, auth, DB, PWA.
5. **Sugerencias inteligentes**: detectar tipo de app y mostrar QuickActions contextuales (auth, DB, PWA, GitHub, deploy, admin, móvil, reportes, pagos). Ya implementado en `QuickActionsBar.tsx` + `contextualActions.ts`.
6. **Acciones rápidas reales**: cada botón ejecuta cambios reales (crea/edita archivos, configura servicios, dispara prompts correctos). No decorativas.
7. **Modo constructor premium**: distinguir crear-nuevo / editar-existente / corregir / sugerir / deploy / backend / GitHub. Nunca mezclar proyectos. Nunca abrir un proyecto existente como nuevo.
8. **Gestión de proyectos**: dashboard abre proyectos recientes con archivos + preview + historial + última versión persistida. Evitar proyectos vacíos.
9. **Preview + Código + Visual sincronizados**: cambios en cualquiera se reflejan en el proyecto real.
10. **GitHub real**: OAuth sin error redirect_uri, repo por proyecto, push estable, sync confiable.
11. **Deploy real**: cada proyecto generado con `netlify.toml` + `_redirects` SPA + build estable. Botón Deploy funcional.
12. **PWA y móvil**: cuando aplique, responsive mobile-first, manifest.json, SW (deshabilitado en iframe/preview), instalable.
13. **Backend real**: si requiere backend → Supabase con auth y tablas reales + RLS. No mocks ni localStorage cuando se pidió persistencia.
14. **Calidad de producto**: pensar como si se fuera a vender. Nada de demos falsas.
15. **Validación obligatoria antes de entregar**: archivos existen → guardado OK → preview corre → sin errores críticos → reabrible → sin bloques fallidos → deploy-ready si se pidió.

## Prohibido
- Preview temporal sin archivos
- Proyectos vacíos
- Respuestas que aparenten éxito sin persistencia real
- Módulos a medias
- Dejar errores importantes sin resolver

**Why:** El usuario quiere Nexa Builder como producto real, no demo.

**How to apply:** Antes de responder a cada pedido del usuario sobre el builder o sus proyectos, recorrer mentalmente las 15 reglas. Si detectas algo roto en el builder, arreglarlo antes de agregar features nuevos.
