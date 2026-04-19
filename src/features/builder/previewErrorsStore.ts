/**
 * Store separado para errores de runtime del preview.
 * - Mantiene historial (no solo el último)
 * - Dedupe por signature (message + primer frame del stack)
 * - Cuenta repeticiones
 *
 * Vive fuera del builderStore para no re-renderizar todo cuando
 * el iframe spamea el mismo error.
 */
import { create } from 'zustand';

export interface PreviewErrorEntry {
  id: string;
  message: string;
  stack: string;
  /** Path del archivo inferido del stack (ej. "src/components/Foo.tsx") */
  inferredFile: string | null;
  /** Línea inferida del stack, si la hay */
  inferredLine: number | null;
  /** Timestamps de cada ocurrencia */
  occurrences: number[];
  firstAt: number;
  lastAt: number;
}

interface State {
  errors: PreviewErrorEntry[];
  /** Push con dedupe — devuelve la entry actualizada/creada */
  push: (e: { message: string; stack?: string; at?: number }) => PreviewErrorEntry;
  clear: () => void;
  remove: (id: string) => void;
  latest: () => PreviewErrorEntry | null;
}

const MAX_ERRORS = 25;

/**
 * Genera signature estable: primer frame del stack + mensaje (sin números).
 * Errores idénticos en distintas instancias se agrupan.
 */
function signatureOf(message: string, stack: string): string {
  const firstFrame = stack.split('\n').find((l) => l.trim().startsWith('at ')) || '';
  // Normaliza línea/columna y blob URLs para que el mismo error desde blobs
  // distintos se considere igual
  const normFrame = firstFrame
    .replace(/blob:[^:)\s]+/g, 'blob')
    .replace(/:\d+:\d+/g, ':L:C');
  const normMsg = message.replace(/\d+/g, 'N').slice(0, 200);
  return `${normMsg}::${normFrame}`;
}

/**
 * Infiere path de archivo del proyecto (src/…) y línea del primer frame
 * que contenga una referencia a un módulo conocido. Como los blobs no
 * llevan el path original, intentamos extraerlo del mensaje cuando el
 * loader del preview lo incluye (ej. "Module not found: src/foo.tsx").
 */
function inferFileFromStack(
  message: string,
  stack: string,
): { file: string | null; line: number | null } {
  const all = `${message}\n${stack}`;
  // 1) Patrón con extensión (preferido — más específico)
  const explicitExt = all.match(/(?:src\/|@\/)[\w/\-.]+\.(?:tsx?|jsx?|css)/);
  if (explicitExt) {
    const path = explicitExt[0].startsWith('@/')
      ? `src/${explicitExt[0].slice(2)}`
      : explicitExt[0];
    const lineMatch = all.match(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)`));
    return { file: path, line: lineMatch ? parseInt(lineMatch[1], 10) : null };
  }
  // 2) Patrón sin extensión (típico en errores "Module not found: @/lib/foo")
  const noExt = all.match(/(?:src\/|@\/)[\w/\-]+/);
  if (noExt) {
    const path = noExt[0].startsWith('@/') ? `src/${noExt[0].slice(2)}` : noExt[0];
    return { file: path, line: null };
  }
  return { file: null, line: null };
}

let counter = 0;
const nextId = () => `err-${Date.now()}-${++counter}`;

export const usePreviewErrorsStore = create<State>((set, get) => ({
  errors: [],

  push: ({ message, stack = '', at = Date.now() }) => {
    const sig = signatureOf(message, stack);
    let updated: PreviewErrorEntry | null = null;

    set((s) => {
      const existing = s.errors.find((e) => signatureOf(e.message, e.stack) === sig);
      if (existing) {
        updated = {
          ...existing,
          occurrences: [...existing.occurrences, at].slice(-50),
          lastAt: at,
          // refresca stack si el nuevo es más rico
          stack: stack.length > existing.stack.length ? stack : existing.stack,
        };
        return {
          errors: s.errors.map((e) => (e.id === existing.id ? updated! : e)),
        };
      }
      const inferred = inferFileFromStack(message, stack);
      updated = {
        id: nextId(),
        message,
        stack,
        inferredFile: inferred.file,
        inferredLine: inferred.line,
        occurrences: [at],
        firstAt: at,
        lastAt: at,
      };
      const next = [...s.errors, updated];
      if (next.length > MAX_ERRORS) next.splice(0, next.length - MAX_ERRORS);
      return { errors: next };
    });

    return updated!;
  },

  clear: () => set({ errors: [] }),
  remove: (id) => set((s) => ({ errors: s.errors.filter((e) => e.id !== id) })),
  latest: () => {
    const errs = get().errors;
    return errs.length ? errs[errs.length - 1] : null;
  },
}));

/** Construye el prompt de auto-fix con contexto enriquecido. */
export function buildFixPrompt(
  err: PreviewErrorEntry,
  files: { path: string; content: string }[],
): string {
  const lines: string[] = [];
  lines.push('El preview lanza el siguiente error en runtime. Arréglalo.');
  lines.push('');
  lines.push('## Error');
  lines.push('```');
  lines.push(err.message);
  if (err.stack) {
    lines.push('');
    lines.push(err.stack.split('\n').slice(0, 8).join('\n'));
  }
  lines.push('```');

  if (err.occurrences.length > 1) {
    lines.push('');
    lines.push(`(este error ocurrió ${err.occurrences.length} veces)`);
  }

  if (err.inferredFile) {
    const file = files.find((f) => f.path === err.inferredFile);
    if (file) {
      lines.push('');
      lines.push(`## Archivo sospechoso: \`${file.path}\``);
      if (err.inferredLine) {
        lines.push(`(error cerca de línea ${err.inferredLine})`);
      }
      lines.push('```tsx');
      // Incluye solo ±20 líneas alrededor de la inferida si existe, o todo el archivo si es chico
      const allLines = file.content.split('\n');
      if (err.inferredLine && allLines.length > 60) {
        const start = Math.max(0, err.inferredLine - 20);
        const end = Math.min(allLines.length, err.inferredLine + 20);
        lines.push(`// líneas ${start + 1}-${end} de ${allLines.length}`);
        lines.push(allLines.slice(start, end).join('\n'));
      } else {
        lines.push(file.content.slice(0, 4000));
      }
      lines.push('```');
    }
  }

  return lines.join('\n').slice(0, 6000);
}
