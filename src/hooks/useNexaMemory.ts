/**
 * Hook de memoria persistente del proyecto (Nexa Intelligence).
 *
 * Carga la memoria al montar (y cuando cambia projectId) y expone helpers
 * declarativos para que los paneles registren sugerencias aceptadas, módulos
 * instalados, decisiones y reverts SIN tocar el shape directamente.
 *
 * IMPORTANTE (estabilidad / OOM):
 *  - `acceptedIds` se memoiza por referencia para que los `useEffect` que
 *    dependen de él NO se disparen en cada render (esto causaba un loop de
 *    `updateMemory` → `AbortError: Lock broken` en producción).
 *  - Los mutators se serializan en una cola por proyecto: nunca corren dos
 *    `loadMemory + upsert` concurrentes contra Supabase, evitando contención
 *    del web-lock de auth.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  emptyMemory,
  loadMemory,
  recordAcceptedSuggestion,
  recordContext,
  recordDecision,
  recordInstalledModule,
  recordRevert,
  updateMemory,
  acceptedIds as acceptedIdsFn,
  type NexaMemory,
} from '@/features/knowledge/nexaMemoryService';
import type { AppKind, ProjectLevel } from '@/features/builder/suggestions/contextualActions';

export interface UseNexaMemory {
  memory: NexaMemory;
  loading: boolean;
  acceptedIds: Set<string>;
  refresh: () => Promise<void>;
  registerAccepted: (s: { id: string; label: string }) => Promise<void>;
  registerModule: (m: { id: string; label: string; credits?: number; actionId?: string }) => Promise<void>;
  registerDecision: (d: { key: string; value: string }) => Promise<void>;
  registerRevert: (label: string) => Promise<void>;
  syncContext: (ctx: { kind: AppKind | null; level: ProjectLevel | null }) => Promise<void>;
}

export function useNexaMemory(projectId: string): UseNexaMemory {
  const { user } = useAuth();
  const [memory, setMemory] = useState<NexaMemory>(emptyMemory);
  const [loading, setLoading] = useState(false);

  // FIFO queue per hook instance — serializa los upserts contra Supabase.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  const refresh = useCallback(async () => {
    if (!projectId) {
      setMemory(emptyMemory());
      return;
    }
    setLoading(true);
    try {
      const m = await loadMemory(projectId);
      setMemory(m);
    } catch (e) {
      console.warn('[nexa-memory] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mutate = useCallback(
    (mut: (m: NexaMemory) => NexaMemory) => {
      if (!projectId || !user?.id) return Promise.resolve();
      const next = queueRef.current.then(async () => {
        try {
          const updated = await updateMemory(projectId, user.id, mut);
          setMemory(updated);
        } catch (e) {
          console.warn('[nexa-memory] update failed', e);
        }
      });
      queueRef.current = next.catch(() => undefined);
      return next;
    },
    [projectId, user?.id],
  );

  const registerAccepted = useCallback(
    (s: { id: string; label: string }) => mutate((m) => recordAcceptedSuggestion(m, s)),
    [mutate],
  );
  const registerModule = useCallback(
    (m: { id: string; label: string; credits?: number; actionId?: string }) =>
      mutate((mem) => recordInstalledModule(mem, m)),
    [mutate],
  );
  const registerDecision = useCallback(
    (d: { key: string; value: string }) => mutate((m) => recordDecision(m, d)),
    [mutate],
  );
  const registerRevert = useCallback(
    (label: string) => mutate((m) => recordRevert(m, label)),
    [mutate],
  );
  // syncContext se llama en cada cambio de archivos. Evitamos persistir si
  // el contexto ya coincide con el último valor (no-op silencioso).
  const lastCtxRef = useRef<{ kind: AppKind | null; level: ProjectLevel | null } | null>(null);
  const syncContext = useCallback(
    (ctx: { kind: AppKind | null; level: ProjectLevel | null }) => {
      const last = lastCtxRef.current;
      if (last && last.kind === ctx.kind && last.level === ctx.level) {
        return Promise.resolve();
      }
      lastCtxRef.current = ctx;
      return mutate((m) => recordContext(m, ctx));
    },
    [mutate],
  );

  // Memoizamos acceptedIds para que `useEffect` consumidores no entren en loop.
  const accepted = useMemo(() => acceptedIdsFn(memory), [memory]);

  return {
    memory,
    loading,
    acceptedIds: accepted,
    refresh,
    registerAccepted,
    registerModule,
    registerDecision,
    registerRevert,
    syncContext,
  };
}
