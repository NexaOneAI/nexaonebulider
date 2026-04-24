/**
 * Logger central de eventos IA — `logEventoIA`.
 *
 * Reglas:
 *  - Todo sale del IntentPlanJson (no se duplica lógica).
 *  - Persiste en `project_knowledge.content.nexa_logs` (vía nexaMemoryService).
 *  - "Fire and forget": nunca rompe el flujo principal.
 *  - Una sola función para tipos: plan_aplicado | error | analisis.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  loadMemory,
  recordLogEvent,
  updateMemory,
  type NexaLogEvento,
  type NexaLogResultado,
  type NexaLogTipo,
} from '@/features/knowledge/nexaMemoryService';
import type { IntentPlanJson } from '@/features/builder/intent/intentEngine';

export interface LogEventoIAParams {
  tipo: NexaLogTipo;
  proyectoId: string;
  /** Plan canónico — fuente única de verdad para acción/archivos/cambios. */
  plan?: IntentPlanJson | Record<string, unknown> | null;
  /** Override opcional si no hay plan (ej: error puro de análisis). */
  accion?: string;
  archivos?: string[];
  resultado?: NexaLogResultado;
  /** Duración de la operación en ms (calcula con `Date.now() - t0`). */
  duracionMs?: number;
  /** Datos extra (modelo, créditos, error, etc.) */
  meta?: Record<string, unknown>;
}

function pickAccion(plan: LogEventoIAParams['plan'], fallback?: string): string {
  if (plan && typeof plan === 'object') {
    const obj = plan as Record<string, unknown>;
    if (typeof obj.accion === 'string' && obj.accion) return obj.accion;
    if (typeof obj.action === 'string' && obj.action) return obj.action as string;
  }
  return fallback ?? 'evento-ia';
}

function pickArchivos(
  plan: LogEventoIAParams['plan'],
  fallback?: string[],
): string[] {
  if (plan && typeof plan === 'object') {
    const obj = plan as Record<string, unknown>;
    if (Array.isArray(obj.archivos)) return obj.archivos as string[];
  }
  return fallback ?? [];
}

/**
 * Registra un evento estructurado en la memoria del proyecto.
 * Devuelve `true` si se persistió, `false` si se omitió silenciosamente.
 */
export async function logEventoIA(params: LogEventoIAParams): Promise<boolean> {
  try {
    const { proyectoId } = params;
    if (!proyectoId) return false;
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return false;

    const evento: NexaLogEvento = {
      tipo: params.tipo,
      accion: pickAccion(params.plan, params.accion),
      archivos: pickArchivos(params.plan, params.archivos),
      resultado: params.resultado ?? (params.tipo === 'error' ? 'fail' : 'success'),
      duracion_ms: Math.max(0, Math.round(params.duracionMs ?? 0)),
      timestamp: new Date().toISOString(),
      proyectoId,
      meta: params.meta,
    };

    await updateMemory(proyectoId, userId, (mem) => recordLogEvent(mem, evento));
    return true;
  } catch (e) {
    console.warn('[nexa-log] failed', e);
    return false;
  }
}

/** Lee solo los logs (atajo sobre loadMemory). */
export async function listEventosIA(proyectoId: string): Promise<NexaLogEvento[]> {
  try {
    const mem = await loadMemory(proyectoId);
    return mem.nexa_logs ?? [];
  } catch {
    return [];
  }
}
