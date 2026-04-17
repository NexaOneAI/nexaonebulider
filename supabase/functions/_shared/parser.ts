/**
 * Robust parser for AI responses. Tries tool_calls first, then content JSON.
 */
export function parseAIResponse(data: any): any | null {
  // 1. Tool call path
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      // continue to fallback
    }
  }

  // 2. Content JSON path
  const content = data?.choices?.[0]?.message?.content || "";
  if (!content) return null;

  const cleaned = content
    .replace(/```(?:json)?\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract first JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}
