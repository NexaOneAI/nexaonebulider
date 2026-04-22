/**
 * useAutoSave — debounces calls to builderStore.saveVersion('auto') so a
 * checkpoint version is created 30 seconds after the user stops editing
 * code manually in the CodeEditor. AI generations and version restores
 * reset `dirty` to false so this never fires after them.
 */
import { useEffect, useRef } from 'react';
import { useBuilderStore } from '@/features/builder/builderStore';

const DEBOUNCE_MS = 30_000;

export function useAutoSave() {
  const dirty = useBuilderStore((s) => s.dirty);
  const projectId = useBuilderStore((s) => s.projectId);
  const saveVersion = useBuilderStore((s) => s.saveVersion);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!dirty || !projectId) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      saveVersion('auto').catch(() => {});
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [dirty, projectId, saveVersion]);
}
