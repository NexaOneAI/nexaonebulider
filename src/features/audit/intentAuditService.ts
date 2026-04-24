/**
 * Auditoría de planes IA — guarda cada apply/deploy en `intent_audit_logs`.
 *
 * Diseño:
 *  - "Fire and forget": los errores nunca rompen el flujo principal.
 *  - Guarda el IntentPlanJson completo + metadatos (modelo, créditos, etc.).
 *  - Sirve para troubleshooting, observabilidad y soporte.
 */
import { supabase } from '@/integrations/supabase/client';
import type { IntentPlanJson } from '@/features/builder/intent/intentEngine';

export type IntentAuditEvent =
  | 'apply'
  | 'deploy'
  | 'revert'
  | 'apply_failed'
  | 'deploy_failed';

export interface IntentAuditLog {
  id: string;
  user_id: string;
  project_id: string | null;
  event_type: IntentAuditEvent;
  accion: string;
  riesgo: string | null;
  archivos: string[];
  cambios: string[];
  plan_json: IntentPlanJson | Record<string, unknown>;
  status: 'success' | 'failed';
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface RecordParams {
  eventType: IntentAuditEvent;
  projectId?: string | null;
  planJson: IntentPlanJson | Record<string, unknown>;
  status?: 'success' | 'failed';
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

/** Registra un evento de auditoría. Nunca lanza — silencia errores en consola. */
export async function recordIntentAudit(params: RecordParams): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return; // sin sesión no podemos cumplir RLS
    const json = params.planJson as Record<string, unknown>;
    const accion =
      (json.accion as string) || (json.action as string) || 'sin-acción';
    const riesgo = (json.riesgo as string) || null;
    const archivos = Array.isArray(json.archivos)
      ? (json.archivos as string[])
      : [];
    const cambios = Array.isArray(json.cambios)
      ? (json.cambios as string[])
      : [];
    const row = {
      user_id: userId,
      project_id: params.projectId ?? null,
      event_type: params.eventType,
      accion,
      riesgo,
      archivos,
      cambios,
      plan_json: json,
      status: params.status ?? 'success',
      error_message: params.errorMessage ?? null,
      metadata: params.metadata ?? {},
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('intent_audit_logs') as any).insert(row);
    if (error) console.warn('[intent-audit] insert failed', error.message);
  } catch (e) {
    console.warn('[intent-audit] unexpected', e);
  }
}

/** Lista logs (para una futura UI de auditoría). */
export async function listIntentAuditLogs(
  projectId?: string,
  limit = 50,
): Promise<IntentAuditLog[]> {
  let q = supabase
    .from('intent_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as IntentAuditLog[]) ?? [];
}
