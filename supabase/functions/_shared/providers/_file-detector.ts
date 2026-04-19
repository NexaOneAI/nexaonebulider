/**
 * Heuristic mid-stream detector for newly-completed `"path": "..."` entries
 * inside the streamed BuilderOutput JSON. Used by the generate-app-stream
 * pipeline to push `event: file` to the FileTree before the full payload
 * has finished arriving.
 *
 * Authoritative parsing still happens at end-of-stream — this is a UX
 * layer only.
 */

const FILE_PATH_RE =
  /"((?:src\/|app\/|components?\/|pages?\/|lib\/|hooks?\/|styles?\/|public\/|index\.html|package\.json|vite\.config\.[tj]s|tailwind\.config\.[tj]s|tsconfig\.json|README\.md|\.env)[^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;

export function detectFiles(
  buffer: string,
  alreadyEmitted: Set<string>,
): Array<{ path: string; size: number }> {
  const out: Array<{ path: string; size: number }> = [];
  // Reset lastIndex because the regex is module-level (g flag).
  FILE_PATH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FILE_PATH_RE.exec(buffer)) !== null) {
    const path = m[1];
    if (alreadyEmitted.has(path)) continue;
    alreadyEmitted.add(path);
    out.push({ path, size: m[2].length });
  }
  return out;
}

/**
 * Cheap test: is it worth re-scanning the whole assembled buffer? We only
 * scan when the latest delta closes a JSON string with a comma or brace
 * which indicates a value boundary may have just been completed.
 */
export function shouldRescan(delta: string): boolean {
  return /"\s*[,}]/.test(delta);
}
