import type { BuilderOutput } from "../types.ts";

function fallbackBuilderOutput(prompt: string): BuilderOutput {
  return {
    projectName: "Nueva App",
    description: "Lovable Gateway no configurado",
    dependencies: [],
    files: {
      "src/App.tsx": `export default function App() {
  return <div style={{padding:24}}>Lovable Gateway no configurado. Prompt: ${prompt.replace(/`/g, "")}</div>;
}`,
    },
    previewCode: `export default function App() { return <div style={{padding:24}}>Lovable no configurado</div>; }`,
  };
}

function cleanJsonResponse(raw: string) {
  let text = raw.trim();
  text = text.replace(/^```json\s*/i, "");
  text = text.replace(/^```\s*/i, "");
  text = text.replace(/```$/i, "");
  text = text.trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

/**
 * Calls Lovable AI Gateway (OpenAI-compatible) using LOVABLE_API_KEY.
 * Default model: google/gemini-3-flash-preview.
 */
export async function callLovable(prompt: string, model: string): Promise<BuilderOutput> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return fallbackBuilderOutput(prompt);

  const systemPrompt = `
Devuelve exclusivamente JSON válido.
No uses markdown.
No uses triple backticks.

Genera una app React + Vite + TypeScript.

Formato obligatorio:
{
  "projectName": "string",
  "description": "string",
  "dependencies": ["string"],
  "files": {
    "src/App.tsx": "string",
    "src/main.tsx": "string"
  },
  "previewCode": "string"
}
`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    return fallbackBuilderOutput(prompt);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "";

  try {
    return JSON.parse(cleanJsonResponse(content));
  } catch {
    return fallbackBuilderOutput(prompt);
  }
}
