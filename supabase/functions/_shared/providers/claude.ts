import type { BuilderOutput } from "../types.ts";

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

function fallbackBuilderOutput(prompt: string): BuilderOutput {
  return {
    projectName: "Nueva App",
    description: "Proyecto generado por Claude",
    dependencies: ["react-router-dom"],
    files: {
      "src/App.tsx": `export default function App() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Arial, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1>App generada con Claude</h1>
        <p>${prompt.replace(/`/g, "")}</p>
      </div>
    </main>
  );
}
`,
      "src/main.tsx": `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    },
    previewCode: `export default function App() { return <div style={{padding:24}}>Preview Claude</div>; }`,
  };
}

/**
 * Calls Anthropic Messages API directly.
 * Default model when none provided: claude-3-5-sonnet-latest.
 */
export async function callClaude(prompt: string, model: string): Promise<BuilderOutput> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-3-5-sonnet-latest",
      max_tokens: 4096,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return fallbackBuilderOutput(prompt);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text ?? "";

  try {
    return JSON.parse(cleanJsonResponse(content));
  } catch {
    return fallbackBuilderOutput(prompt);
  }
}
