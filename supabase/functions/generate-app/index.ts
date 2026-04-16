import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CREDIT_COSTS: Record<string, number> = {
  create: 5,
  edit: 3,
};

const SYSTEM_PROMPT = `You are an expert React/TypeScript/Tailwind developer. Generate complete, production-ready React applications.

CRITICAL: Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "projectName": "short-name",
  "description": "Brief description",
  "files": [
    { "path": "src/App.tsx", "content": "...", "language": "tsx" },
    { "path": "src/main.tsx", "content": "...", "language": "tsx" },
    { "path": "index.html", "content": "...", "language": "html" }
  ],
  "dependencies": { "react": "^18.3.0", "react-dom": "^18.3.0" },
  "pages": ["App"],
  "components": ["App"]
}

Rules:
- ALWAYS include src/App.tsx, src/main.tsx, and index.html
- Use Tailwind CSS utility classes
- Write clean, modern TypeScript/React
- Make UI beautiful, responsive, and functional
- Include all imports and exports
- The app must render without errors`;

const EDIT_SYSTEM_PROMPT = `You are an expert React/TypeScript/Tailwind developer. You are editing an existing app based on user instructions.

You will receive the current files and a modification request. Return the COMPLETE updated set of files (not just changed ones).

CRITICAL: Return ONLY valid JSON with this exact structure (no markdown):
{
  "projectName": "name",
  "description": "Updated description",
  "files": [ { "path": "...", "content": "...", "language": "..." } ],
  "dependencies": {},
  "pages": [],
  "components": []
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY no configurada" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { prompt, model, mode, currentFiles, projectId } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "El prompt es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth: verify user
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "No autorizado. Inicia sesión." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for credit operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get user profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("credits, is_unlimited")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Perfil de usuario no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credit check
    const creditCost = CREDIT_COSTS[mode] || CREDIT_COSTS.create;
    if (!profile.is_unlimited && profile.credits < creditCost) {
      return new Response(
        JSON.stringify({
          error: `Créditos insuficientes. Necesitas ${creditCost} créditos, tienes ${profile.credits}.`,
          credits_required: creditCost,
          credits_available: profile.credits,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct credits BEFORE calling AI (will rollback on failure)
    let creditsDeducted = false;
    if (!profile.is_unlimited) {
      const { error: deductError } = await adminClient
        .from("profiles")
        .update({ credits: profile.credits - creditCost })
        .eq("id", user.id);

      if (deductError) {
        return new Response(
          JSON.stringify({ error: "Error al descontar créditos" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      creditsDeducted = true;
    }

    try {
      // Build messages for AI
      const systemPrompt = mode === "edit" ? EDIT_SYSTEM_PROMPT : SYSTEM_PROMPT;
      const userContent =
        mode === "edit"
          ? `Current app files:\n\`\`\`json\n${currentFiles}\n\`\`\`\n\nUser request: ${prompt}\n\nReturn ALL files (including unchanged ones) as the complete updated app.`
          : prompt;

      const aiModel = model || "google/gemini-3-flash-preview";

      // Call Lovable AI Gateway with tool calling for structured output
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
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_app",
                  description: "Generate or update a React application",
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
                      pages: { type: "array", items: { type: "string" } },
                      components: { type: "array", items: { type: "string" } },
                    },
                    required: ["projectName", "description", "files", "dependencies", "pages", "components"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "generate_app" } },
          }),
        }
      );

      if (!response.ok) {
        // Rollback credits
        if (creditsDeducted) {
          await adminClient
            .from("profiles")
            .update({ credits: profile.credits })
            .eq("id", user.id);
        }

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Demasiadas solicitudes. Espera unos segundos." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Créditos de IA agotados en el gateway." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();

      // Parse response
      let result: any = null;

      // Try tool call first
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        result = JSON.parse(toolCall.function.arguments);
      }

      // Fallback: parse content as JSON
      if (!result) {
        const content = data.choices?.[0]?.message?.content || "";
        const cleaned = content.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      }

      if (!result || !Array.isArray(result.files)) {
        if (creditsDeducted) {
          await adminClient
            .from("profiles")
            .update({ credits: profile.credits })
            .eq("id", user.id);
        }
        throw new Error("No se pudo parsear la respuesta de la IA");
      }

      // Record credit transaction
      await adminClient.from("credit_transactions").insert({
        user_id: user.id,
        type: "debit",
        amount: creditCost,
        reason: mode === "edit" ? "Edición de app con IA" : "Generación de app con IA",
        model: aiModel,
        project_id: projectId || null,
      });

      // Save version if projectId provided
      if (projectId) {
        // Get next version number
        const { data: versions } = await adminClient
          .from("project_versions")
          .select("version_number")
          .eq("project_id", projectId)
          .order("version_number", { ascending: false })
          .limit(1);

        const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

        await adminClient.from("project_versions").insert({
          project_id: projectId,
          version_number: nextVersion,
          prompt,
          model_used: aiModel,
          generated_files: result.files,
          output_json: result,
        });

        // Update project status
        await adminClient
          .from("projects")
          .update({ status: "active", name: result.projectName || undefined })
          .eq("id", projectId);
      }

      // Save AI message
      if (projectId) {
        await adminClient.from("ai_messages").insert([
          {
            project_id: projectId,
            user_id: user.id,
            role: "user",
            content: prompt,
            model: aiModel,
          },
          {
            project_id: projectId,
            user_id: user.id,
            role: "assistant",
            content: `App ${mode === "edit" ? "actualizada" : "generada"} con ${result.files.length} archivos`,
            model: aiModel,
          },
        ]);
      }

      // Return result with metadata
      return new Response(
        JSON.stringify({
          ...result,
          _meta: {
            credits_used: creditCost,
            credits_remaining: profile.is_unlimited ? -1 : profile.credits - creditCost,
            model: aiModel,
            mode,
            version: projectId ? "saved" : "unsaved",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiError) {
      // Rollback credits on AI failure
      if (creditsDeducted) {
        await adminClient
          .from("profiles")
          .update({ credits: profile.credits })
          .eq("id", user.id);

        // Record refund
        await adminClient.from("credit_transactions").insert({
          user_id: user.id,
          type: "refund",
          amount: creditCost,
          reason: `Rollback: ${aiError instanceof Error ? aiError.message : "Error de IA"}`,
          model: model || "unknown",
          project_id: projectId || null,
        });
      }
      throw aiError;
    }
  } catch (error) {
    console.error("generate-app error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
