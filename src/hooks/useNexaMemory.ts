/**
 * Hook de memoria persistente del proyecto (Nexa Intelligence).
 *
 * Carga la memoria al montar (y cuando cambia projectId) y expone helpers
 * declarativos para que los paneles registren sugerencias aceptadas, módulos
 * instalados, decisiones y reverts SIN tocar el shape directamente.
 */
import { useCallback, useEffect, useState } from 'react';
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
    async (mut: (m: NexaMemory) => NexaMemory) => {
      if (!projectId || !user?.id) return;
      try {
        const next = await updateMemory(projectId, user.id, mut);
        setMemory(next);
      } catch (e) {
        console.warn('[nexa-memory] update failed', e);
      }
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
  const syncContext = useCallback(
    (ctx: { kind: AppKind | null; level: ProjectLevel | null }) =>
      mutate((m) => recordContext(m, ctx)),
    [mutate],
  );

  return {
    memory,
    loading,
    acceptedIds: acceptedIdsFn(memory),
    refresh,
    registerAccepted,
    registerModule,
    registerDecision,
    registerRevert,
    syncContext,
  };
}
