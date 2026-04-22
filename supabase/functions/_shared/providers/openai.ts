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
    description: "Proyecto generado por OpenAI",
    dependencies: ["react-router-dom"],
    files: {
      "src/App.tsx": `export default function App() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Arial, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1>App generada con OpenAI</h1>
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
    previewCode: `export default function App() { return <div style={{padding:24}}>Preview OpenAI</div>; }`,
  };
}

export async function callOpenAI(prompt: string, model: string): Promise<BuilderOutput> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return fallbackBuilderOutput(prompt);

  const systemPrompt = `
Devuelve exclusivamente JSON válido.
No uses markdown.
No uses triple backticks.

Genera una app React + Vite + TypeScript.

REGLAS DE DISEÑO: Mobile-first responsive (Tailwind sm: md: lg:). 360px sin
scroll horizontal. Áreas táctiles min 44x44px. "container mx-auto px-4 sm:px-6".
Hamburger menu en mobile. aria-labels y alt en imágenes.

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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
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
