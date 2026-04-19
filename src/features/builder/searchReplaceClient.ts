/**
 * Client-side mirror of supabase/functions/_shared/searchReplace.ts
 * Used to apply SEARCH/REPLACE blocks progressively while a streaming
 * edit is in flight. Server still re-applies authoritatively at the end.
 */

export interface SearchReplaceBlock {
  search: string;
  replace: string;
}

export function applyBlock(content: string, block: SearchReplaceBlock): string | null {
  if (block.search === '') return block.replace;
  if (content.includes(block.search)) {
    return content.replace(block.search, block.replace);
  }

  const normalize = (s: string) =>
    s.split('\n').map((l) => l.replace(/[ \t]+$/g, '')).join('\n');
  const nContent = normalize(content);
  const nSearch = normalize(block.search);
  if (nContent.includes(nSearch)) {
    return nContent.replace(nSearch, normalize(block.replace));
  }

  // Indentation-tolerant fallback
  const searchLines = block.search.split('\n');
  const stripCommonIndent = (lines: string[]) => {
    const indents = lines
      .filter((l) => l.trim().length > 0)
      .map((l) => l.match(/^\s*/)?.[0].length ?? 0);
    const min = indents.length ? Math.min(...indents) : 0;
    return { stripped: lines.map((l) => l.slice(min)), indent: min };
  };
  const { stripped: stripSearch } = stripCommonIndent(searchLines);
  const stripSearchStr = stripSearch.join('\n');
  const contentLines = content.split('\n');

  for (let i = 0; i <= contentLines.length - stripSearch.length; i++) {
    const window = contentLines.slice(i, i + stripSearch.length);
    const { stripped: stripWin, indent } = stripCommonIndent(window);
    if (stripWin.join('\n') === stripSearchStr) {
      const indentStr = ' '.repeat(indent);
      const reindented = block.replace
        .split('\n')
        .map((l) => indentStr + l)
        .join('\n');
      const before = contentLines.slice(0, i).join('\n');
      const after = contentLines.slice(i + stripSearch.length).join('\n');
      return [before, reindented, after].filter((s) => s !== undefined).join('\n');
    }
  }

  return null;
}
