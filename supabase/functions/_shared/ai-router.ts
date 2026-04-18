import { callOpenAI } from "./providers/openai.ts";
import { callGemini } from "./providers/gemini.ts";
import { callClaude } from "./providers/claude.ts";
import { callGrok } from "./providers/grok.ts";
import { callLovable } from "./providers/lovable.ts";
import type { AiProvider, BuilderOutput } from "./types.ts";

export async function callAiProvider(
  provider: AiProvider,
  prompt: string,
  model: string,
): Promise<BuilderOutput> {
  switch (provider) {
    case "openai":
      return await callOpenAI(prompt, model);
    case "gemini":
      return await callGemini(prompt, model);
    case "claude":
      return await callClaude(prompt, model);
    case "grok":
      return await callGrok(prompt, model);
    case "lovable":
      return await callLovable(prompt, model);
    default:
      return await callOpenAI(prompt, model);
  }
}
