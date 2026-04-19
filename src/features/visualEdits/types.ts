/**
 * Types for the Visual Edits feature.
 * A "visual edit" is a non-AI, no-credits change applied directly by the
 * user via the in-preview editor (text content, color, font, spacing,
 * common attributes like src/href/placeholder).
 */
import type { GeneratedFile } from '@/features/projects/projectTypes';

export interface ElementLocation {
  /** File path in the project, e.g. "src/App.tsx" */
  path: string;
  /** 1-based source line number where the JSX element opens */
  line: number;
  /** 1-based source column number */
  column: number;
}

export interface ElementAttributes {
  src?: string;
  href?: string;
  placeholder?: string;
  alt?: string;
  title?: string;
}

export interface SelectedElement {
  /** Unique id used for the overlay highlight (data-loc-id) */
  uid: string;
  /** Bounding rect in iframe coordinates */
  rect: { x: number; y: number; width: number; height: number };
  /** Tag name in lowercase (e.g. "button", "h1") */
  tag: string;
  /** Current textContent (only safe to edit for leaf-text nodes) */
  text: string;
  /** Whether the element is a "pure text" leaf (no element children) */
  isTextLeaf: boolean;
  /** Current Tailwind className string (raw, as written in source) */
  className: string;
  /** Source location, when available */
  location: ElementLocation | null;
  /** A short snippet from the source (used for heuristic fallback) */
  snippet?: string;
  /** Common attributes captured from the live DOM (best-effort). */
  attributes?: ElementAttributes;
}

export type AttrName = 'src' | 'href' | 'placeholder' | 'alt' | 'title';

export type VisualEditKind =
  | { kind: 'text'; value: string }
  | { kind: 'addClass'; classes: string[]; removePrefixes?: string[] }
  | { kind: 'removeClass'; classes: string[] }
  | { kind: 'attr'; name: AttrName; value: string };

export interface PendingEdit {
  /** Unique id for this individual edit (not the element uid). */
  id: string;
  uid: string;
  element: SelectedElement;
  change: VisualEditKind;
  /** Human label for the history panel */
  label: string;
  /** Snapshot of the affected file BEFORE this edit, used for individual undo. */
  beforeFile: GeneratedFile | null;
}
