import type { GeneratedFile } from '../projects/projectTypes';

export interface FileMatch {
  file: GeneratedFile;
  score: number;
  /** Indices in `file.path.split('/').pop()` that matched the query */
  matchIndices: number[];
}

export interface ContentMatch {
  file: GeneratedFile;
  line: number;
  column: number;
  preview: string;
  /** Range [start, end) inside `preview` where the query matched */
  highlight: [number, number];
}

/**
 * Lightweight fuzzy matcher: returns score and indices when all chars of
 * `query` appear in `target` in order (case-insensitive). Lower score = better.
 */
export function fuzzyMatch(query: string, target: string): { score: number; indices: number[] } | null {
  if (!query) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const indices: number[] = [];
  let ti = 0;
  let lastMatch = -1;
  let gaps = 0;

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = -1;
    while (ti < t.length) {
      if (t[ti] === ch) {
        found = ti;
        break;
      }
      ti++;
    }
    if (found === -1) return null;
    indices.push(found);
    if (lastMatch !== -1) gaps += found - lastMatch - 1;
    lastMatch = found;
    ti++;
  }

  // Score: lower is better. Prefer matches at the start and contiguous.
  const startBonus = indices[0] === 0 ? -10 : indices[0];
  const score = gaps * 2 + startBonus + (target.length - q.length) * 0.1;
  return { score, indices };
}

export function searchFilesByName(query: string, files: GeneratedFile[], limit = 50): FileMatch[] {
  if (!files.length) return [];
  if (!query.trim()) {
    return files.slice(0, limit).map((file) => ({ file, score: 0, matchIndices: [] }));
  }

  const matches: FileMatch[] = [];
  for (const file of files) {
    const basename = file.path.split('/').pop() || file.path;
    const result = fuzzyMatch(query, basename);
    if (result) {
      matches.push({ file, score: result.score, matchIndices: result.indices });
    } else {
      // Fallback: try matching against full path
      const pathResult = fuzzyMatch(query, file.path);
      if (pathResult) {
        matches.push({ file, score: pathResult.score + 5, matchIndices: [] });
      }
    }
  }

  matches.sort((a, b) => a.score - b.score);
  return matches.slice(0, limit);
}

export function searchContent(
  query: string,
  files: GeneratedFile[],
  options: { caseSensitive?: boolean; limit?: number } = {},
): ContentMatch[] {
  const { caseSensitive = false, limit = 200 } = options;
  if (!query) return [];

  const needle = caseSensitive ? query : query.toLowerCase();
  const matches: ContentMatch[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const haystack = caseSensitive ? lines[i] : lines[i].toLowerCase();
      let from = 0;
      while (from <= haystack.length) {
        const idx = haystack.indexOf(needle, from);
        if (idx === -1) break;

        const previewStart = Math.max(0, idx - 20);
        const previewEnd = Math.min(lines[i].length, idx + needle.length + 60);
        const preview = lines[i].slice(previewStart, previewEnd);
        const highlightStart = idx - previewStart;

        matches.push({
          file,
          line: i + 1,
          column: idx + 1,
          preview,
          highlight: [highlightStart, highlightStart + needle.length],
        });

        if (matches.length >= limit) return matches;
        from = idx + needle.length;
      }
    }
  }

  return matches;
}
