

## Estado actual

Iteración 1 (streaming + DevTools + A/B toggle) ✅ y Iteración 2 (Visual Edits) ✅ están completas. 43 tests passing, type-check OK.

## Lo que falta del roadmap original

**Iteración 3 — Sandbox real (WebContainers / Sandpack)**: el preview actual usa iframe + Sucrase + esm.sh. Funciona pero no ejecuta `npm install` real, no soporta APIs Node, ni hot-reload nativo. Era el último gran bloque.

**Pulido de Iteración 2 — Visual Edits**: la base funciona pero hay rough edges conocidos:
- Sin undo individual (solo "descartar todo")
- Sin atajos de teclado (Esc, Ctrl+S, navegar al padre)
- No edita atributos comunes (img.src, a.href, input.placeholder)
- Heurística de fallback no testeada con casos reales de duplicados

**Pulido de Iteración 1 — Streaming**:
- Sin tests de integración del `streamEditAction` (mock del SSE → verificar progressive vs tokens-only)
- Validación end-to-end manual pendiente

**Otras mejoras pendientes detectadas en código**:
- `previewLogsStore` no tiene límite de retención (puede crecer indefinido en sesiones largas)
- `VersionHistory` muestra badges pero no permite filtrar por tipo (visual_edit vs full vs diff)
- No hay forma de previsualizar una versión vieja sin restaurarla

## Opciones recomendadas (por orden de impacto)

```text
A. Sandbox real (3-5 días)
   └─ PoC Sandpack detrás de feature flag
   └─ Comparar con iframe actual: bundle, perf, DX
   └─ Más impacto, más riesgo

B. Pulido Visual Edits (1 día)
   └─ Undo individual + atajos teclado + atributos comunes
   └─ Bajo riesgo, mejora UX inmediata

C. Tests de integración Iter 1 (medio día)
   └─ Mock SSE → verificar A/B realmente cambian comportamiento
   └─ Cierra deuda técnica

D. Validación end-to-end manual (30 min)
   └─ Te guío paso a paso, verificas en preview
   └─ Sin código, valida lo construido

E. Mejoras VersionHistory (medio día)
   └─ Filtros por tipo, preview sin restaurar
   └─ Pequeño pero útil
```

## Mi recomendación

Antes de meterte con **A (Sandbox)** — que es 3-5 días y técnicamente arriesgado — vale la pena hacer **D (validación manual, 30 min)** para confirmar que Iter 1 + Iter 2 funcionan en runtime. Si todo ok, **B (pulido Visual Edits)** te deja un feature redondo antes de empezar el bloque grande.

Si tienes prisa por cerrar el roadmap, salta directo a **A** y aceptas la deuda.

Dime qué prefieres y arranco.

