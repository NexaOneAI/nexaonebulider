/**
 * Visual Edits store (Zustand). Holds the current selection, enabled flag,
 * and pending edits buffer. Edits are applied to files immediately so the
 * preview reflects the change, and committed as a new project_version
 * (without consuming credits) when the user clicks "Guardar".
 */
import { create } from 'zustand';
import type { SelectedElement, PendingEdit, VisualEditKind } from './types';
import type { GeneratedFile } from '@/features/projects/projectTypes';
import { useBuilderStore } from '@/features/builder/builderStore';
import { generatePreviewHtml } from '@/features/builder/preview';
import { applyBlock } from '@/features/builder/searchReplaceClient';
import { rewriteClassNameAt, rewriteTextAt } from './locResolver';
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
  discardPending: () => void;
  commit: () => Promise<{ ok: boolean; error?: string }>;
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

    // Lazy snapshot baseline on first edit
    const nextBaseline = baseline ?? files.map((f) => ({ ...f }));

    // Compute the source edit
    const loc = parseLocation(selected.location as unknown as string | null);
    if (!loc) {
      console.warn('[visual-edits] Element has no data-loc; cannot edit reliably');
      return false;
    }

    let edit: { path: string; search: string; replace: string } | null = null;
    if (change.kind === 'text') {
      if (!selected.isTextLeaf) return false;
      edit = rewriteTextAt(files, loc, selected.text, change.value);
    } else if (change.kind === 'addClass') {
      const removePrefixes = change.removePrefixes && change.removePrefixes.length > 0
        ? change.removePrefixes
        : change.classes.flatMap(prefixesForToken);
      const nextClassName = replaceClasses(selected.className, removePrefixes, change.classes);
      edit = rewriteClassNameAt(files, loc, nextClassName);
      if (edit) {
        // Update selected.className in memory so subsequent edits stack
        set({ selected: { ...selected, className: nextClassName } });
      }
    } else if (change.kind === 'removeClass') {
      const nextClassName = replaceClasses(selected.className, change.classes, []);
      edit = rewriteClassNameAt(files, loc, nextClassName);
      if (edit) {
        set({ selected: { ...selected, className: nextClassName } });
      }
    }

    if (!edit) return false;

    const target = files.find((f) => f.path === edit!.path);
    if (!target) return false;
    const nextContent = applyBlock(target.content, { search: edit.search, replace: edit.replace });
    if (nextContent == null) return false;

    const nextFiles = files.map((f) =>
      f.path === edit!.path ? { ...f, content: nextContent } : f,
    );
    const previewCode = generatePreviewHtml(nextFiles, builder.projectName, builder.model);
    useBuilderStore.setState({ files: nextFiles, previewCode });

    set({
      baseline: nextBaseline,
      pending: [
        ...pending,
        { uid: selected.uid, element: selected, change, label },
      ],
    });
    return true;
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
      // Find next version number
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
          })),
        } as any,
      });
      if (error) throw error;

      // Add a chat message explaining the save (no AI call)
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
  // From the iframe we receive raw "path:line:col" string
  const [path, line, col] = loc.split(':');
  if (!path || !line || !col) return null;
  return { path, line: parseInt(line, 10), column: parseInt(col, 10) };
}
