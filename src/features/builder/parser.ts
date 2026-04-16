import type { AIStructuredResponse } from '../ai/aiTypes';

/**
 * Clean markdown code fences from AI response
 */
export function cleanMarkdownFences(raw: string): string {
  return raw
    .replace(/```(?:json|javascript|typescript|tsx|jsx)?\s*\n?/g, '')
    .replace(/```\s*/g, '')
    .trim();
}

/**
 * Attempt to fix common JSON issues from AI responses
 */
function fixBrokenJson(raw: string): string {
  let fixed = raw;
  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,\s*([\]}])/g, '$1');
  // Fix unescaped newlines in strings
  fixed = fixed.replace(/(?<=":[ ]*"[^"]*)\n(?=[^"]*")/g, '\\n');
  return fixed;
}

/**
 * Parse AI structured response from raw string — robust parser
 * that handles markdown fences, broken JSON, and various formats
 */
export function parseAIResponse(raw: string): AIStructuredResponse | null {
  if (!raw || typeof raw !== 'string') return null;

  // Strategy 1: Direct parse
  try {
    const parsed = JSON.parse(raw);
    return validateAndNormalize(parsed);
  } catch { /* continue */ }

  // Strategy 2: Clean markdown fences
  try {
    const cleaned = cleanMarkdownFences(raw);
    const parsed = JSON.parse(cleaned);
    return validateAndNormalize(parsed);
  } catch { /* continue */ }

  // Strategy 3: Extract JSON object from text
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateAndNormalize(parsed);
    } catch {
      // Strategy 4: Fix broken JSON
      try {
        const fixed = fixBrokenJson(jsonMatch[0]);
        const parsed = JSON.parse(fixed);
        return validateAndNormalize(parsed);
      } catch { /* continue */ }
    }
  }

  // Strategy 5: Try to extract from array of files pattern
  const filesMatch = raw.match(/"files"\s*:\s*\[[\s\S]*?\]/);
  if (filesMatch) {
    try {
      const wrapped = `{${filesMatch[0]},"projectName":"Generated","description":"","dependencies":{},"pages":[],"components":[]}`;
      const parsed = JSON.parse(wrapped);
      return validateAndNormalize(parsed);
    } catch { /* continue */ }
  }

  return null;
}

/**
 * Validate and normalize the parsed response
 */
function validateAndNormalize(data: unknown): AIStructuredResponse | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  // Must have files array
  const files = Array.isArray(obj.files) ? obj.files : [];
  if (files.length === 0) return null;

  // Validate each file has path and content
  const validFiles = files
    .filter((f: any) => f && typeof f.path === 'string' && typeof f.content === 'string')
    .map((f: any) => ({
      path: f.path,
      content: f.content,
      language: f.language || guessLanguage(f.path),
    }));

  if (validFiles.length === 0) return null;

  return {
    projectName: (obj.projectName as string) || (obj.name as string) || 'Untitled',
    description: (obj.description as string) || '',
    files: validFiles,
    dependencies: (obj.dependencies as Record<string, string>) || {},
    pages: Array.isArray(obj.pages) ? obj.pages : [],
    components: Array.isArray(obj.components) ? obj.components : [],
  };
}

function guessLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    tsx: 'tsx', ts: 'typescript', jsx: 'jsx', js: 'javascript',
    css: 'css', html: 'html', json: 'json', md: 'markdown',
  };
  return map[ext] || 'text';
}
