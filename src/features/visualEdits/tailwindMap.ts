/**
 * Tailwind v3 class palettes used by the Visual Edits popover.
 * We restrict to the subset that is most commonly used so the popover
 * stays compact and predictable.
 */

export const TW_TEXT_COLORS = [
  'text-foreground', 'text-muted-foreground', 'text-primary', 'text-secondary',
  'text-white', 'text-black',
  'text-slate-900', 'text-slate-700', 'text-slate-500',
  'text-red-500', 'text-orange-500', 'text-amber-500', 'text-yellow-500',
  'text-lime-500', 'text-green-500', 'text-emerald-500', 'text-teal-500',
  'text-cyan-500', 'text-sky-500', 'text-blue-500', 'text-indigo-500',
  'text-violet-500', 'text-purple-500', 'text-fuchsia-500', 'text-pink-500', 'text-rose-500',
];

export const TW_BG_COLORS = [
  'bg-background', 'bg-card', 'bg-muted', 'bg-primary', 'bg-secondary', 'bg-accent',
  'bg-white', 'bg-black', 'bg-transparent',
  'bg-slate-100', 'bg-slate-300', 'bg-slate-700', 'bg-slate-900',
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500',
];

export const TW_FONT_SIZES = [
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl',
  'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl',
];

export const TW_FONT_WEIGHTS = [
  'font-thin', 'font-extralight', 'font-light', 'font-normal',
  'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black',
];

export const TW_FONT_FAMILIES = [
  'font-sans', 'font-serif', 'font-mono',
];

export const TW_SPACING_SCALE = [
  '0', '0.5', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24',
];

/** Prefix → palette of Tailwind tokens that should be replaced together. */
export const TW_GROUPS: Record<string, string[]> = {
  // text color: text-{name}-{shade?} but NOT text-{size}, text-foreground etc.
  // We keep this generic by listing the full tokens we offer.
  textColor: TW_TEXT_COLORS,
  bgColor: TW_BG_COLORS,
  fontSize: TW_FONT_SIZES,
  fontWeight: TW_FONT_WEIGHTS,
  fontFamily: TW_FONT_FAMILIES,
};

/**
 * Build the spacing class palettes (padding/margin/gap) on demand.
 * E.g. `paddingClasses('p')` → ['p-0', 'p-0.5', ..., 'p-24']
 */
export function spacingClasses(prefix: 'p' | 'px' | 'py' | 'm' | 'mx' | 'my' | 'gap'): string[] {
  return TW_SPACING_SCALE.map((s) => `${prefix}-${s}`);
}

/** All known prefixes for spacing edits — used to strip duplicates. */
export const SPACING_PREFIXES: Array<'p' | 'px' | 'py' | 'm' | 'mx' | 'my' | 'gap'> = [
  'p', 'px', 'py', 'm', 'mx', 'my', 'gap',
];

/**
 * Replace tokens in a className string:
 *  1. Remove any token that starts with a prefix in `removePrefixes`
 *     (matched whole-word, with optional `-` suffix to avoid clobbering)
 *  2. Append the new classes
 *  3. Dedupe + tidy whitespace
 *
 * Example:
 *   replaceClasses('p-2 bg-red-500 text-white', ['bg-'], ['bg-blue-500'])
 *   → 'p-2 text-white bg-blue-500'
 */
export function replaceClasses(
  className: string,
  removePrefixes: string[],
  add: string[],
): string {
  const tokens = className.split(/\s+/).filter(Boolean);
  const removeRegexes = removePrefixes.map(
    (p) => new RegExp('^' + escapeRegex(p) + '(?:[a-z0-9.\\-]*)$', 'i'),
  );
  const kept = tokens.filter((t) => !removeRegexes.some((r) => r.test(t)));
  const result = [...kept, ...add.filter(Boolean)];
  // dedupe preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of result) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.join(' ');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Given a target Tailwind class, infer the prefixes that should be removed
 * to avoid having two conflicting classes (e.g. two `bg-*` colors).
 *
 * Returns prefixes WITHOUT the trailing dash so `replaceClasses'`
 * regex (which adds `[a-z0-9.\-]*`) can match `bg-red-500`, `bg-foo`, etc.
 */
export function prefixesForToken(token: string): string[] {
  if (TW_TEXT_COLORS.includes(token)) {
    // text colors collide with each other — but text-xs etc are sizes, so
    // we only remove other entries from our palette
    return TW_TEXT_COLORS;
  }
  if (TW_BG_COLORS.includes(token)) return TW_BG_COLORS;
  if (TW_FONT_SIZES.includes(token)) return ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl'];
  if (TW_FONT_WEIGHTS.includes(token)) return TW_FONT_WEIGHTS;
  if (TW_FONT_FAMILIES.includes(token)) return TW_FONT_FAMILIES;
  // spacing
  const sp = token.match(/^(p|px|py|m|mx|my|gap)-/);
  if (sp) return [`${sp[1]}-`];
  return [];
}
