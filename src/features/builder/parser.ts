import type { AIStructuredResponse } from '../ai/aiTypes';

/**
 * Clean markdown fences from AI response
 */
export function cleanMarkdownFences(raw: string): string {
  return raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
}

/**
 * Parse AI structured response from raw string
 */
export function parseAIResponse(raw: string): AIStructuredResponse | null {
  try {
    const cleaned = cleanMarkdownFences(raw);
    const parsed = JSON.parse(cleaned);
    return validateStructure(parsed);
  } catch {
    // Try to extract JSON from the string
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return validateStructure(parsed);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function validateStructure(data: Record<string, unknown>): AIStructuredResponse | null {
  if (!data || typeof data !== 'object') return null;

  return {
    projectName: (data.projectName as string) || 'Untitled',
    description: (data.description as string) || '',
    files: Array.isArray(data.files) ? data.files : [],
    dependencies: (data.dependencies as Record<string, string>) || {},
    pages: Array.isArray(data.pages) ? data.pages : [],
    components: Array.isArray(data.components) ? data.components : [],
  };
}
