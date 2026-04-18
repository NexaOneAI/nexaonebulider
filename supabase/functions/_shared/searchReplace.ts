/**
 * SEARCH/REPLACE block parser & applier (Aider-style).
 *
 * The AI returns blocks of the form:
 *
 *   <<<<<<< SEARCH
 *   exact existing text
 *   =======
 *   new text
 *   >>>>>>> REPLACE
 *
 * - SEARCH must match the file content exactly (whitespace included).
 * - We tolerate small indentation drift via a fallback re-indent pass.
 * - An empty SEARCH means "create file" (whole content = replace block).
 * - To delete a file the action is set to "delete" at the block level (no markers needed).
 */

export type EditAction = "modify" | "create" | "delete";

export interface SearchReplaceBlock {
  search: string;
  replace: string;
}

export interface FileEdit {
  path: string;
  action: EditAction;
  language?: string;
  blocks: SearchReplaceBlock[];
}

export interface ApplyResult {
  applied: number;
  failed: Array<{ path: string; index: number; reason: string }>;
  files: Array<{ path: string; content: string; language: string }>;
  bytesSaved: number;
}

const SEARCH_MARK = "<<<<<<< SEARCH";
const SEP_MARK = "=======";
const REPLACE_MARK = ">>>>>>> REPLACE";

/**
 * Parse the AI raw text into structured FileEdits.
 * Format expected from the model (one entry per file):
 *
 *   ### path/to/file.tsx
 *   ACTION: modify
 *   LANG: tsx
 *   <<<<<<< SEARCH
 *   ...
 *   =======
 *   ...
 *   >>>>>>> REPLACE
 *   <<<<<<< SEARCH
 *   ...
 *   =======
 *   ...
 *   >>>>>>> REPLACE
 */
export function parseSearchReplaceText(raw: string): FileEdit[] {
  if (!raw || typeof raw !== "string") return [];
  const lines = raw.split(/\r?\n/);
  const edits: FileEdit[] = [];
  let current: FileEdit | null = null;
  let mode: "idle" | "search" | "replace" = "idle";
  let searchBuf: string[] = [];
  let replaceBuf: string[] = [];

  const flushBlock = () => {
    if (!current) return;
    current.blocks.push({
      search: searchBuf.join("\n"),
      replace: replaceBuf.join("\n"),
    });
    searchBuf = [];
    replaceBuf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      if (current) edits.push(current);
      current = {
        path: trimmed.slice(4).trim(),
        action: "modify",
        language: undefined,
        blocks: [],
      };
      mode = "idle";
      continue;
    }
    if (!current) continue;

    if (trimmed.startsWith("ACTION:")) {
      const v = trimmed.slice(7).trim().toLowerCase();
      if (v === "create" || v === "delete" || v === "modify") current.action = v as EditAction;
      continue;
    }
    if (trimmed.startsWith("LANG:")) {
      current.language = trimmed.slice(5).trim();
      continue;
    }

    if (trimmed === SEARCH_MARK) {
      mode = "search";
      searchBuf = [];
      continue;
    }
    if (trimmed === SEP_MARK && mode === "search") {
      mode = "replace";
      replaceBuf = [];
      continue;
    }
    if (trimmed === REPLACE_MARK && mode === "replace") {
      flushBlock();
      mode = "idle";
      continue;
    }

    if (mode === "search") searchBuf.push(line);
    else if (mode === "replace") replaceBuf.push(line);
  }

  if (current) edits.push(current);
  return edits;
}

/**
 * Try to apply a single SEARCH/REPLACE block to the given content.
 * Returns null if no match was found.
 *
 * Strategy:
 * 1. Exact match.
 * 2. Trim trailing whitespace per-line on both sides and retry.
 * 3. Try each possible re-indent (strip common leading whitespace, then re-add).
 */
export function applyBlock(content: string, block: SearchReplaceBlock): string | null {
  if (block.search === "") {
    // Whole-file replace (used for "create").
    return block.replace;
  }
  if (content.includes(block.search)) {
    return content.replace(block.search, block.replace);
  }

  // Normalize trailing spaces.
  const normalize = (s: string) => s.split("\n").map((l) => l.replace(/[ \t]+$/g, "")).join("\n");
  const nContent = normalize(content);
  const nSearch = normalize(block.search);
  if (nContent.includes(nSearch)) {
    return nContent.replace(nSearch, normalize(block.replace));
  }

  // Indentation-tolerant fallback.
  const searchLines = block.search.split("\n");
  const stripCommonIndent = (lines: string[]) => {
    const indents = lines.filter((l) => l.trim().length > 0).map((l) => l.match(/^\s*/)?.[0].length ?? 0);
    const min = indents.length ? Math.min(...indents) : 0;
    return { stripped: lines.map((l) => l.slice(min)), indent: min };
  };
  const { stripped: stripSearch } = stripCommonIndent(searchLines);
  const stripSearchStr = stripSearch.join("\n");
  const contentLines = content.split("\n");

  for (let i = 0; i <= contentLines.length - stripSearch.length; i++) {
    const window = contentLines.slice(i, i + stripSearch.length);
    const { stripped: stripWin, indent } = stripCommonIndent(window);
    if (stripWin.join("\n") === stripSearchStr) {
      const indentStr = " ".repeat(indent);
      const reindented = block.replace
        .split("\n")
        .map((l, idx) => (idx === 0 || l.length === 0 ? indentStr + l : indentStr + l))
        .join("\n");
      const before = contentLines.slice(0, i).join("\n");
      const after = contentLines.slice(i + stripSearch.length).join("\n");
      return [before, reindented, after].filter((s) => s !== undefined).join("\n");
    }
  }

  return null;
}

/**
 * Apply all parsed edits over a baseline file map.
 * Returns the new file list + per-block failure log + bytes saved vs full-content.
 */
export function applyEdits(
  currentFiles: Array<{ path: string; content: string; language: string }>,
  edits: FileEdit[],
): ApplyResult {
  const fileMap = new Map<string, { path: string; content: string; language: string }>();
  for (const f of currentFiles) fileMap.set(f.path, { ...f });

  const failed: ApplyResult["failed"] = [];
  let applied = 0;
  let bytesSaved = 0;

  for (const edit of edits) {
    if (edit.action === "delete") {
      fileMap.delete(edit.path);
      applied++;
      continue;
    }

    if (edit.action === "create") {
      const content = edit.blocks.map((b) => b.replace).join("\n");
      fileMap.set(edit.path, {
        path: edit.path,
        content,
        language: edit.language || "text",
      });
      applied++;
      continue;
    }

    // modify
    const target = fileMap.get(edit.path);
    if (!target) {
      failed.push({ path: edit.path, index: -1, reason: "Archivo no existe (esperaba modify)" });
      continue;
    }

    let working = target.content;
    const originalSize = working.length;
    let blocksContentSize = 0;
    let allOk = true;

    for (let i = 0; i < edit.blocks.length; i++) {
      const block = edit.blocks[i];
      blocksContentSize += block.search.length + block.replace.length;
      const next = applyBlock(working, block);
      if (next === null) {
        failed.push({ path: edit.path, index: i, reason: "SEARCH no encontrado en archivo" });
        allOk = false;
        continue;
      }
      working = next;
      applied++;
    }

    if (allOk || working !== target.content) {
      fileMap.set(edit.path, { ...target, content: working, language: edit.language || target.language });
      // Saved bytes = full file content the AI would have sent − blocks content actually sent.
      bytesSaved += Math.max(0, originalSize - blocksContentSize);
    }
  }

  return {
    applied,
    failed,
    files: Array.from(fileMap.values()),
    bytesSaved,
  };
}
