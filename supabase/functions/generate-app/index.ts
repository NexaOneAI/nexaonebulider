import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser, getAdminClient } from "../_shared/auth.ts";
import {
  CREDIT_TIERS,
  classifyTier,
  checkCreditsAndDeduct,
  refundCredits,
  recordDebit,
  type Tier,
} from "../_shared/credits.ts";
import { parseAIResponse } from "../_shared/parser.ts";

const SYSTEM_PROMPT = `You are an expert React/TypeScript/Tailwind developer. Generate complete, production-ready React applications.

Use the generate_app tool to return your response with this structure:
- projectName: short kebab-case name
- description: brief description
- files: array of { path, content, language } — ALWAYS include src/App.tsx, src/main.tsx, index.html
- dependencies: npm package map
- pages, components: string arrays

Rules:
- Use Tailwind CSS utility classes
- Write clean, modern TypeScript/React
- Make UI beautiful, responsive, and functional
- Include all imports/exports
- The app must render without errors`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "generate_app",
    description: "Generate a complete React application",
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
        dependencies: { type: "object", additionalProperties: { type: "string" } },
        pages: { type: "array", items: { type: "string" } },
        components: { type: "array", items: { type: "string" } },
      },
      required: ["projectName", "description", "files", "dependencies", "pages", "components"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY no configurada" }, 500);

  try {
    const { prompt, model, projectId, userTier } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return jsonResponse({ error: "El prompt es requerido" }, 400);
    }

    const { user, error: authError } = await requireUser(req);
    if (authError || !user) return jsonResponse({ error: authError }, 401);

    const admin = getAdminClient();

    // Determine tier (heuristic + user override)
    const tier: Tier = classifyTier(prompt, "create", userTier as Tier);
    const cost = CREDIT_TIERS[tier];

    // Check & deduct credits
    const creditCheck = await checkCreditsAndDeduct(admin, user.id, cost);
    if (!creditCheck.ok) {
      return jsonResponse(
        {
          error: creditCheck.error,
          credits_required: creditCheck.required,
          credits_available: creditCheck.available,
          tier,
        },
        creditCheck.status,
      );
    }

    const aiModel = model || "google/gemini-3-flash-preview";

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "function", function: { name: "generate_app" } },
        }),
      });

      if (!response.ok) {
        if (!creditCheck.isUnlimited) {
          await refundCredits(admin, user.id, cost, `AI gateway ${response.status}`, aiModel, projectId);
        }
        if (response.status === 429) return jsonResponse({ error: "Demasiadas solicitudes. Espera unos segundos." }, 429);
        if (response.status === 402) return jsonResponse({ error: "Créditos de IA agotados en el gateway." }, 402);
        const errText = await response.text();
        console.error("AI gateway error:", response.status, errText);
        return jsonResponse({ error: `AI gateway error: ${response.status}` }, 502);
      }

      const data = await response.json();
      const result = parseAIResponse(data);

      if (!result || !Array.isArray(result.files) || result.files.length === 0) {
        if (!creditCheck.isUnlimited) {
          await refundCredits(admin, user.id, cost, "Respuesta inválida de IA", aiModel, projectId);
        }
        return jsonResponse({ error: "No se pudo parsear la respuesta de la IA" }, 502);
      }

      // Record debit
      await recordDebit(admin, user.id, cost, "Generación de app con IA", aiModel, projectId, tier);

      // Save version + project metadata
      if (projectId) {
        const { data: versions } = await admin
          .from("project_versions")
          .select("version_number")
          .eq("project_id", projectId)
          .order("version_number", { ascending: false })
          .limit(1);

        const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

        // Generate preview HTML for restoration
        const previewCode = generatePreviewSnapshot(result.files, result.projectName);

        await admin.from("project_versions").insert({
          project_id: projectId,
          version_number: nextVersion,
          prompt,
          model_used: aiModel,
          generated_files: result.files,
          output_json: result,
          preview_code: previewCode,
        });

        await admin
          .from("projects")
          .update({ status: "active", name: result.projectName || undefined })
          .eq("id", projectId);

        await admin.from("ai_messages").insert([
          { project_id: projectId, user_id: user.id, role: "user", content: prompt, model: aiModel },
          {
            project_id: projectId,
            user_id: user.id,
            role: "assistant",
            content: `App generada con ${result.files.length} archivos (${cost} créditos · ${tier})`,
            model: aiModel,
          },
        ]);
      }

      return jsonResponse({
        ...result,
        _meta: {
          credits_used: cost,
          credits_remaining: creditCheck.isUnlimited ? -1 : creditCheck.balance,
          model: aiModel,
          tier,
          mode: "create",
          version: projectId ? "saved" : "unsaved",
        },
      });
    } catch (aiError) {
      if (!creditCheck.isUnlimited) {
        await refundCredits(
          admin,
          user.id,
          cost,
          aiError instanceof Error ? aiError.message : "Error de IA",
          aiModel,
          projectId,
        );
      }
      throw aiError;
    }
  } catch (error) {
    console.error("generate-app error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});

function generatePreviewSnapshot(files: any[], _name: string): string {
  // Simple snapshot — full preview is generated client-side
  const appFile = files.find((f) => f.path === "src/App.tsx" || f.path === "src/App.jsx");
  return appFile?.content?.substring(0, 5000) || "";
}
