/**
 * Visual Edits store (Zustand). Holds the current selection, enabled flag,
 * and pending edits buffer. Edits are applied to files immediately so the
 * preview reflects the change, and committed as a new project_version
 * (without consuming credits) when the user clicks "Guardar".
 *
 * Per-edit undo: each pending edit carries `beforeFile` — the snapshot of
 * the affected file BEFORE it was applied. To revert, we replace the
 * file with that snapshot and then replay every later edit that touched
 * the same file from the (now older) baseline.
 */
import { create } from 'zustand';
import type { SelectedElement, PendingEdit, VisualEditKind, AttrName } from './types';
import type { GeneratedFile } from '@/features/projects/projectTypes';
import { useBuilderStore } from '@/features/builder/builderStore';
import { generatePreviewHtml } from '@/features/builder/preview';
import { applyBlock } from '@/features/builder/searchReplaceClient';
import { rewriteAttributeAt, rewriteClassNameAt, rewriteTextAt } from './locResolver';
import { replaceClasses, prefixesForToken } from './tailwindMap';
import { supabase } from '@/integrations/supabase/client';
import { generateId } from '@/lib/utils';

interface VisualEditsState {
  enabled: boolean;
  selected: SelectedElement | null;
  /** Files snapshot before any pending visual edits, used for "discard". */
  baseline: GeneratedFile[] | null;
  pending: PendingEdit[];
  saving: boolean;
}

interface VisualEditsActions {
  setEnabled: (v: boolean) => void;
  setSelected: (el: SelectedElement | null) => void;
  applyChange: (change: VisualEditKind, label: string) => boolean;
  /** Revert a single pending edit by its id. Replays subsequent edits. */
  revertEdit: (editId: string) => void;
  discardPending: () => void;
  commit: () => Promise<{ ok: boolean; error?: string }>;
}

function computeEdit(
  files: GeneratedFile[],
  selected: SelectedElement,
  change: VisualEditKind,
): { path: string; search: string; replace: string; nextClassName?: string } | null {
  const loc = parseLocation(selected.location as unknown as string | null);
  if (!loc) return null;

  if (change.kind === 'text') {
    if (!selected.isTextLeaf) return null;
    return rewriteTextAt(files, loc, selected.text, change.value);
  }
  if (change.kind === 'attr') {
    return rewriteAttributeAt(files, loc, change.name, change.value);
  }
  if (change.kind === 'addClass') {
    const removePrefixes =
      change.removePrefixes && change.removePrefixes.length > 0
        ? change.removePrefixes
        : change.classes.flatMap(prefixesForToken);
    const nextClassName = replaceClasses(selected.className, removePrefixes, change.classes);
    const e = rewriteClassNameAt(files, loc, nextClassName);
    return e ? { ...e, nextClassName } : null;
  }
  if (change.kind === 'removeClass') {
    const nextClassName = replaceClasses(selected.className, change.classes, []);
    const e = rewriteClassNameAt(files, loc, nextClassName);
    return e ? { ...e, nextClassName } : null;
  }
  return null;
}

export const useVisualEditsStore = create<VisualEditsState & VisualEditsActions>((set, get) => ({
  enabled: false,
  selected: null,
  baseline: null,
  pending: [],
  saving: false,

  setEnabled: (v) => {
    if (!v) {
      // Turning off discards selection but keeps pending (user can save later)
      set({ enabled: false, selected: null });
    } else {
      set({ enabled: true });
    }
  },

  setSelected: (el) => set({ selected: el }),

  applyChange: (change, label) => {
    const { selected, baseline, pending } = get();
    if (!selected) return false;
    const builder = useBuilderStore.getState();
    const files = builder.files;
    if (files.length === 0) return false;

    const edit = computeEdit(files, selected, change);
    if (!edit) {
      console.warn('[visual-edits] Could not compute edit for change', change);
      return false;
    }

    const target = files.find((f) => f.path === edit.path);
    if (!target) return false;
    const nextContent = applyBlock(target.content, { search: edit.search, replace: edit.replace });
    if (nextContent == null) return false;

    // Lazy snapshot baseline on first edit
    const nextBaseline = baseline ?? files.map((f) => ({ ...f }));
    // Snapshot of the file BEFORE this edit (for individual undo)
    const beforeFile: GeneratedFile = { ...target };

    const nextFiles = files.map((f) =>
      f.path === edit.path ? { ...f, content: nextContent } : f,
    );
    const previewCode = generatePreviewHtml(nextFiles, builder.projectName, builder.model);
    useBuilderStore.setState({ files: nextFiles, previewCode });

    // Update selected.className in memory so subsequent class edits stack
    if (edit.nextClassName !== undefined) {
      set({ selected: { ...selected, className: edit.nextClassName } });
    } else if (change.kind === 'attr') {
      set({
        selected: {
          ...selected,
          attributes: { ...(selected.attributes || {}), [change.name]: change.value },
        },
      });
    } else if (change.kind === 'text') {
      set({ selected: { ...selected, text: change.value } });
    }

    set({
      baseline: nextBaseline,
      pending: [
        ...pending,
        { id: generateId(), uid: selected.uid, element: selected, change, label, beforeFile },
      ],
    });
    return true;
  },

  revertEdit: (editId) => {
    const { pending, baseline } = get();
    const idx = pending.findIndex((p) => p.id === editId);
    if (idx === -1) return;
    const target = pending[idx];
    if (!target.beforeFile) return;

    const builder = useBuilderStore.getState();
    const path = target.beforeFile.path;

    // Step 1: roll the file back to its state BEFORE this edit was applied.
    let workingFiles = builder.files.map((f) =>
      f.path === path ? { ...target.beforeFile! } : f,
    );

    // Step 2: replay every later edit that touched the same file.
    // We rebuild from the snapshot so per-edit search/replace blocks still
    // match (they were captured against the file state at apply time).
    const nextPending: PendingEdit[] = [];
    for (let i = 0; i < pending.length; i++) {
      if (i === idx) continue; // skip the one being reverted
      const p = pending[i];
      nextPending.push(p);
      if (i < idx) continue; // older edits already baked into the baseline
      // Recompute from current selection state — use the captured element.
      const recomputed = computeEdit(workingFiles, p.element, p.change);
      if (!recomputed) continue;
      const file = workingFiles.find((f) => f.path === recomputed.path);
      if (!file) continue;
      const next = applyBlock(file.content, {
        search: recomputed.search,
        replace: recomputed.replace,
      });
      if (next == null) continue;
      workingFiles = workingFiles.map((f) =>
        f.path === recomputed.path ? { ...f, content: next } : f,
      );
    }

    const previewCode = generatePreviewHtml(workingFiles, builder.projectName, builder.model);
    useBuilderStore.setState({ files: workingFiles, previewCode });

    // If no edits remain, clear baseline too (back to "clean" state).
    set({
      pending: nextPending,
      baseline: nextPending.length === 0 ? null : baseline,
      // Deselect — the popover state is no longer in sync with the DOM.
      selected: null,
    });
  },

  discardPending: () => {
    const { baseline } = get();
    if (!baseline) return;
    const builder = useBuilderStore.getState();
    const previewCode = generatePreviewHtml(baseline, builder.projectName, builder.model);
    useBuilderStore.setState({ files: baseline, previewCode });
    set({ baseline: null, pending: [], selected: null });
  },

  commit: async () => {
    const { pending } = get();
    if (pending.length === 0) return { ok: true };
    const builder = useBuilderStore.getState();
    const projectId = builder.projectId;
    const files = builder.files;
    if (!projectId) return { ok: false, error: 'No project id' };

    set({ saving: true });
    try {
      const { data: versions } = await supabase
        .from('project_versions')
        .select('version_number')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(1);
      const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

      const summary = `Visual edits: ${pending.length} cambios`;
      const { error } = await supabase.from('project_versions').insert({
        project_id: projectId,
        version_number: nextVersion,
        prompt: summary,
        model_used: 'visual-edit',
        generated_files: files as any,
        output_json: {
          visual_edit: true,
          changes: pending.map((p) => ({
            label: p.label,
            path: (p.element.location as any)?.path,
            line: (p.element.location as any)?.line,
            kind: p.change.kind,
          })),
        } as any,
      });
      if (error) throw error;

      useBuilderStore.setState((s) => ({
        messages: [
          ...s.messages,
          {
            id: generateId(),
            project_id: projectId,
            role: 'assistant',
            content: `🎨 ${summary} guardados como versión ${nextVersion} — sin gastar créditos.`,
            model: 'visual-edit',
            created_at: new Date().toISOString(),
          },
        ],
        mode: 'edit',
      }));

      set({ baseline: null, pending: [], saving: false, selected: null });
      return { ok: true };
    } catch (e) {
      set({ saving: false });
      return { ok: false, error: e instanceof Error ? e.message : 'Save failed' };
    }
  },
}));

function parseLocation(loc: string | null) {
  if (!loc) return null;
  const [path, line, col] = loc.split(':');
  if (!path || !line || !col) return null;
  return { path, line: parseInt(line, 10), column: parseInt(col, 10) };
}

// Re-export for callers that previously imported from this module.
export type { AttrName } from './types';
