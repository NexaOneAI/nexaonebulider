import type { BuilderOutput } from "../types.ts";

function fallbackBuilderOutput(prompt: string): BuilderOutput {
  return {
    projectName: "Nueva App",
    description: "Proyecto generado por Gemini",
    dependencies: ["react-router-dom"],
    files: {
      "src/App.tsx": `export default function App() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Arial, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1>App generada con Gemini</h1>
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
    previewCode: `export default function App() { return <div style={{padding:24}}>Preview Gemini</div>; }`,
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

const SYSTEM_INSTRUCTION = `
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

export async function callGemini(prompt: string, model: string): Promise<BuilderOutput> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return fallbackBuilderOutput(prompt);

  const modelId = model || "gemini-1.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Mejora 1: separar la instrucción del sistema del prompt del usuario
        systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          // Mejora 2: forzar JSON válido sin markdown
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    return fallbackBuilderOutput(prompt);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  try {
    return JSON.parse(cleanJsonResponse(content));
  } catch {
    return fallbackBuilderOutput(prompt);
  }
}
