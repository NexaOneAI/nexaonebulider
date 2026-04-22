/**
 * versionDiffService — computes a line-by-line diff between two project
 * versions (or between a version and the current in-memory files). Used
 * by the VersionDiffModal to show changes archivo por archivo.
 */
import { diffLines, type Change } from 'diff';
import type { GeneratedFile } from './projectTypes';

export interface FileDiff {
  path: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  changes: Change[];
  /** Quick stats for the header */
  added: number;
  removed: number;
}

export interface VersionDiffSummary {
  files: FileDiff[];
  totals: { added: number; removed: number; filesChanged: number };
}

function toMap(files: GeneratedFile[]): Map<string, GeneratedFile> {
  const m = new Map<string, GeneratedFile>();
  for (const f of files) m.set(f.path, f);
  return m;
}

/**
 * Compare `from` (older) vs `to` (newer / current). Returns per-file diffs
 * including added, removed, modified and (optionally) unchanged files.
 */
export function computeDiff(
  from: GeneratedFile[],
  to: GeneratedFile[],
  opts: { includeUnchanged?: boolean } = {},
): VersionDiffSummary {
  const fromMap = toMap(from);
  const toMap_ = toMap(to);
  const allPaths = new Set<string>([...fromMap.keys(), ...toMap_.keys()]);
  const files: FileDiff[] = [];
  let totalAdded = 0;
  let totalRemoved = 0;
  let filesChanged = 0;

  for (const path of Array.from(allPaths).sort()) {
    const a = fromMap.get(path);
    const b = toMap_.get(path);

    if (!a && b) {
      const added = b.content.split('\n').length;
      totalAdded += added;
      filesChanged += 1;
      files.push({
        path,
        status: 'added',
        changes: [{ value: b.content, added: true, removed: false, count: added }],
        added,
        removed: 0,
      });
      continue;
    }
    if (a && !b) {
      const removed = a.content.split('\n').length;
      totalRemoved += removed;
      filesChanged += 1;
      files.push({
        path,
        status: 'removed',
        changes: [{ value: a.content, added: false, removed: true, count: removed }],
        added: 0,
        removed,
      });
      continue;
    }
    if (a && b) {
      if (a.content === b.content) {
        if (opts.includeUnchanged) {
          files.push({ path, status: 'unchanged', changes: [], added: 0, removed: 0 });
        }
        continue;
      }
      const changes = diffLines(a.content, b.content);
      let added = 0;
      let removed = 0;
      for (const c of changes) {
        if (c.added) added += c.count ?? 0;
        else if (c.removed) removed += c.count ?? 0;
      }
      totalAdded += added;
      totalRemoved += removed;
      filesChanged += 1;
      files.push({ path, status: 'modified', changes, added, removed });
    }
  }

  return {
    files,
    totals: { added: totalAdded, removed: totalRemoved, filesChanged },
  };
}