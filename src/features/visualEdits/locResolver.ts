/**
 * Resolves a visual selection to a precise SEARCH/REPLACE block in source.
 *
 * Two strategies, tried in order:
 *  1) data-loc — the preview transformer injects `data-loc="path:line:col"`
 *     on every JSX element. We then read the corresponding line and locate
 *     the className attribute or text node.
 *  2) Heuristic — match by tag + textContent + className inside the file
 *     map. Brittle for duplicates; only used when data-loc is missing.
 */
import type { GeneratedFile } from '@/features/projects/projectTypes';
import type { AttrName, ElementLocation } from './types';

export interface SourceEdit {
  /** File to modify */
  path: string;
  /** Block input understood by applyBlock (search/replace). */
  search: string;
  replace: string;
}

/**
 * Replace the JSX className= attribute of the element at `loc.line` with
 * `nextClassName`. If the element has no className attribute, insert one
 * right after the tag name.
 */
export function rewriteClassNameAt(
  files: GeneratedFile[],
  loc: ElementLocation,
  nextClassName: string,
): SourceEdit | null {
  const file = files.find((f) => f.path === loc.path);
  if (!file) return null;
  const lines = file.content.split('\n');
  if (loc.line < 1 || loc.line > lines.length) return null;

  // We try a small window because formatters may have wrapped the opening tag.
  const windowStart = Math.max(0, loc.line - 1);
  const windowEnd = Math.min(lines.length, loc.line + 4);
  const original = lines.slice(windowStart, windowEnd).join('\n');

  const classNameRe = /className\s*=\s*(["'])((?:(?!\1).)*?)\1/;
  if (classNameRe.test(original)) {
    const updated = original.replace(
      classNameRe,
      (_m, q) => `className=${q}${nextClassName}${q}`,
    );
    if (updated === original) return null;
    return { path: file.path, search: original, replace: updated };
  }

  // No className present: inject one after the tag name on the data-loc line.
  const headLine = lines[loc.line - 1];
  // Find first <Identifier on that line
  const tagRe = /<([A-Za-z][A-Za-z0-9]*)/;
  const tm = tagRe.exec(headLine);
  if (!tm) return null;
  const insertAt = tm.index + tm[0].length;
  const newHeadLine =
    headLine.slice(0, insertAt) + ` className="${nextClassName}"` + headLine.slice(insertAt);
  const updatedLines = [...lines];
  updatedLines[loc.line - 1] = newHeadLine;
  return {
    path: file.path,
    // Use the single line as the unique search anchor.
    search: headLine,
    replace: newHeadLine,
  };
}

/**
 * Replace the visible text content of the element at `loc.line`.
 * Only safe for "leaf-text" elements — caller must verify isTextLeaf.
 */
export function rewriteTextAt(
  files: GeneratedFile[],
  loc: ElementLocation,
  oldText: string,
  newText: string,
): SourceEdit | null {
  const file = files.find((f) => f.path === loc.path);
  if (!file) return null;
  const lines = file.content.split('\n');
  // Window: opening line + up to 5 trailing lines, since text can sit
  // on the next line after the opening tag.
  const start = Math.max(0, loc.line - 1);
  const end = Math.min(lines.length, loc.line + 5);
  const block = lines.slice(start, end).join('\n');

  const trimmedOld = oldText.trim();
  if (!trimmedOld) return null;
  const idx = block.indexOf(trimmedOld);
  if (idx === -1) {
    // Try heuristic fallback over the whole file
    return rewriteTextHeuristic(file, trimmedOld, newText);
  }
  const updated =
    block.slice(0, idx) + escapeForJsxText(newText) + block.slice(idx + trimmedOld.length);
  if (updated === block) return null;
  return { path: file.path, search: block, replace: updated };
}

/**
 * Replace (or insert) a string-literal attribute value on the element at
 * `loc.line`. Only handles double/single quoted literals — JSX expressions
 * like `src={img}` are intentionally skipped to avoid breaking bindings.
 */
export function rewriteAttributeAt(
  files: GeneratedFile[],
  loc: ElementLocation,
  attr: AttrName,
  nextValue: string,
): SourceEdit | null {
  const file = files.find((f) => f.path === loc.path);
  if (!file) return null;
  const lines = file.content.split('\n');
  if (loc.line < 1 || loc.line > lines.length) return null;

  const windowStart = Math.max(0, loc.line - 1);
  const windowEnd = Math.min(lines.length, loc.line + 4);
  const original = lines.slice(windowStart, windowEnd).join('\n');

  // Match `attr="..."` or `attr='...'` (literal only, skip {expr}).
  const attrRe = new RegExp(`${attr}\\s*=\\s*(["'])((?:(?!\\1).)*?)\\1`);
  if (attrRe.test(original)) {
    const updated = original.replace(
      attrRe,
      (_m, q) => `${attr}=${q}${escapeAttrValue(nextValue, q)}${q}`,
    );
    if (updated === original) return null;
    return { path: file.path, search: original, replace: updated };
  }

  // Refuse to insert/replace when the existing attribute is a JSX expression,
  // because we can't safely rewrite a binding like `src={url}` to a literal.
  const exprRe = new RegExp(`${attr}\\s*=\\s*\\{`);
  if (exprRe.test(original)) return null;

  // Attribute missing: inject after tag name on the head line.
  const headLine = lines[loc.line - 1];
  const tagRe = /<([A-Za-z][A-Za-z0-9]*)/;
  const tm = tagRe.exec(headLine);
  if (!tm) return null;
  const insertAt = tm.index + tm[0].length;
  const newHeadLine =
    headLine.slice(0, insertAt) +
    ` ${attr}="${escapeAttrValue(nextValue, '"')}"` +
    headLine.slice(insertAt);
  return { path: file.path, search: headLine, replace: newHeadLine };
}

function rewriteTextHeuristic(
  file: GeneratedFile,
  oldText: string,
  newText: string,
): SourceEdit | null {
  if (!oldText) return null;
  const idx = file.content.indexOf(oldText);
  if (idx === -1) return null;
  // SECOND occurrence check — if text appears multiple times, refuse.
  const second = file.content.indexOf(oldText, idx + oldText.length);
  if (second !== -1) return null;

  // Build a small unique window around the match.
  const before = file.content.slice(Math.max(0, idx - 40), idx);
  const after = file.content.slice(
    idx + oldText.length,
    Math.min(file.content.length, idx + oldText.length + 40),
  );
  const search = before + oldText + after;
  const replace = before + escapeForJsxText(newText) + after;
  return { path: file.path, search, replace };
}

function escapeForJsxText(s: string): string {
  // Curly braces and the angle brackets must be escaped in JSX text.
  return s.replace(/[{}<>]/g, (c) => `{'${c}'}`);
}

function escapeAttrValue(value: string, quote: string): string {
  // Escape only the matching quote — keeps URLs and most strings intact.
  if (quote === '"') return value.replace(/"/g, '&quot;');
  return value.replace(/'/g, '&#39;');
}
