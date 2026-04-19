/**
 * Annotates JSX source with `data-loc="<path>:<line>:<col>"` on every
 * opening tag. Best-effort regex pass — we cannot do full AST parsing
 * client-side without a heavy dep, so we accept some false positives
 * (e.g. `<Generic>` in a comment). The annotation is harmless when wrong.
 *
 * Rules:
 *  - only annotate tags that don't already have data-loc
 *  - skip self-closing fragments (<>, </>)
 *  - skip closing tags (</X>)
 *  - insert immediately after the tag-name identifier
 */
export function annotateJsxWithDataLoc(source: string, path: string): string {
  const lines = source.split('\n');
  // Tag opener: < + identifier (including dotted member access like Foo.Bar)
  // Negative lookbehind would be ideal but we just check the previous char.
  const tagRe = /<([A-Za-z_$][\w$.]*)/g;
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];
    let result = '';
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    tagRe.lastIndex = 0;
    while ((m = tagRe.exec(line)) !== null) {
      const matchStart = m.index;
      const matchEnd = matchStart + m[0].length;
      const prevChar = matchStart > 0 ? line[matchStart - 1] : '';
      // Skip closing tags `</X` and arrow comparators like `a<B>`
      if (prevChar === '/' || /[\w$)\]]/.test(prevChar)) {
        result += line.slice(lastIdx, matchEnd);
        lastIdx = matchEnd;
        continue;
      }
      // Skip if the next char is a space-then-data-loc (already annotated)
      const after = line.slice(matchEnd, matchEnd + 30);
      if (after.startsWith(' data-loc=')) {
        result += line.slice(lastIdx, matchEnd);
        lastIdx = matchEnd;
        continue;
      }
      const col = matchStart + 1;
      const inject = ` data-loc="${path}:${lineNo}:${col}"`;
      result += line.slice(lastIdx, matchEnd) + inject;
      lastIdx = matchEnd;
    }
    result += line.slice(lastIdx);
    lines[i] = result;
  }
  return lines.join('\n');
}
