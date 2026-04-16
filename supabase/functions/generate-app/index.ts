import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert React/TypeScript developer. Given a user prompt, generate a complete single-page React application.

IMPORTANT: Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{
  "projectName": "short-project-name",
  "description": "Brief description",
  "files": [
    {
      "path": "src/App.tsx",
      "content": "// full file content here",
      "language": "tsx"
    }
  ],
  "dependencies": { "react": "^18.3.0", "react-dom": "^18.3.0" },
  "pages": ["App"],
  "components": ["App"]
}

Rules:
- Always include src/App.tsx, src/main.tsx, and index.html
- Use Tailwind CSS classes for styling
- Write clean, modern TypeScript/React code
- Make the UI beautiful and responsive
- Include proper imports and exports
- The app must be self-contained and runnable`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, model, mode, currentFiles } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userContent =
      mode === "edit"
        ? `Current files:\n${currentFiles}\n\nUser request: ${prompt}\n\nReturn the complete updated files as JSON.`
        : prompt;

    const aiModel = model || "google/gemini-3-flash-preview";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_app",
                description:
                  "Generate a complete React application with files, dependencies, and metadata",
                parameters: {
                  type: "object",
                  properties: {
                    projectName: { type: "string" },
                    description: { type: "string" },
                    files: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          path: { type: "string" },
                          content: { type: "string" },
                          language: { type: "string" },
                        },
                        required: ["path", "content", "language"],
                        additionalProperties: false,
                      },
                    },
                    dependencies: {
                      type: "object",
                      additionalProperties: { type: "string" },
                    },
                    pages: {
                      type: "array",
                      items: { type: "string" },
                    },
                    components: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "projectName",
                    "description",
                    "files",
                    "dependencies",
                    "pages",
                    "components",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "generate_app" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Límite de solicitudes excedido. Intenta de nuevo en unos segundos.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos de IA agotados. Agrega fondos en configuración.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();

    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content as JSON
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No se pudo parsear la respuesta de la IA");
  } catch (error) {
    console.error("generate-app error:", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
