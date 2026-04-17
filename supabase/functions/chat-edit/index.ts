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

const SYSTEM_PROMPT = `You are an expert React/TypeScript/Tailwind developer editing an existing app.

You receive:
1. The current files of the app
2. The recent conversation history
3. A new edit request

Use the edit_app tool to return ONLY the files that change. For each change, set:
- action: "modify" (file exists, replace content), "create" (new file), or "delete" (remove file)
- path: file path
- content: full new content (for modify/create), empty for delete
- language: file language

Rules:
- Be surgical — return ONLY changed files, NOT the entire codebase
- Preserve existing code style and patterns
- Reference conversation history for context (e.g., "make it blue" refers to a previously discussed element)
- Update projectName and description only if the change warrants it`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "edit_app",
    description: "Apply incremental edits to an existing React app",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "One-sentence summary of what changed" },
        projectName: { type: "string" },
        description: { type: "string" },
        changed_files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              content: { type: "string" },
              language: { type: "string" },
              action: { type: "string", enum: ["modify", "create", "delete"] },
            },
            required: ["path", "action", "language", "content"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "changed_files"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY no configurada" }, 500);

  try {
    const { prompt, model, projectId, currentFiles, userTier } = await req.json();

    if (!prompt || typeof prompt !== "string") return jsonResponse({ error: "El prompt es requerido" }, 400);
    if (!Array.isArray(currentFiles) || currentFiles.length === 0) {
      return jsonResponse({ error: "currentFiles es requerido" }, 400);
    }

    const { user, error: authError } = await requireUser(req);
    if (authError || !user) return jsonResponse({ error: authError }, 401);

    const admin = getAdminClient();

    const tier: Tier = classifyTier(prompt, "edit", userTier as Tier);
    const cost = CREDIT_TIERS[tier];

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
      // Load last 6 messages for context
      let history: Array<{ role: string; content: string }> = [];
      if (projectId) {
        const { data: msgs } = await admin
          .from("ai_messages")
          .select("role, content")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(6);
        history = (msgs || []).reverse().map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));
      }

      // Compact file representation
      const filesContext = currentFiles
        .map((f: any) => `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
        .join("\n\n");

      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Current app files:\n\n${filesContext}\n\nReturn ONLY the files that need to change.`,
        },
        ...history,
        { role: "user", content: prompt },
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel,
          messages,
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "function", function: { name: "edit_app" } },
        }),
      });

      if (!response.ok) {
        if (!creditCheck.isUnlimited) {
          await refundCredits(admin, user.id, cost, `AI gateway ${response.status}`, aiModel, projectId);
        }
        if (response.status === 429) return jsonResponse({ error: "Demasiadas solicitudes." }, 429);
        if (response.status === 402) return jsonResponse({ error: "Créditos de IA agotados." }, 402);
        const errText = await response.text();
        console.error("AI gateway error:", response.status, errText);
        return jsonResponse({ error: `AI gateway error: ${response.status}` }, 502);
      }

      const data = await response.json();
      const result = parseAIResponse(data);

      if (!result || !Array.isArray(result.changed_files)) {
        if (!creditCheck.isUnlimited) {
          await refundCredits(admin, user.id, cost, "Respuesta inválida", aiModel, projectId);
        }
        return jsonResponse({ error: "No se pudo parsear la respuesta de la IA" }, 502);
      }

      // Apply diff: merge changed_files into currentFiles
      const fileMap = new Map<string, any>();
      currentFiles.forEach((f: any) => fileMap.set(f.path, f));

      for (const change of result.changed_files) {
        if (change.action === "delete") {
          fileMap.delete(change.path);
        } else {
          fileMap.set(change.path, {
            path: change.path,
            content: change.content,
            language: change.language || "text",
          });
        }
      }

      const mergedFiles = Array.from(fileMap.values());
      const projectName = result.projectName || currentFiles[0]?.projectName || "Mi proyecto";

      await recordDebit(admin, user.id, cost, "Edición de app con IA", aiModel, projectId, tier);

      if (projectId) {
        const { data: versions } = await admin
          .from("project_versions")
          .select("version_number")
          .eq("project_id", projectId)
          .order("version_number", { ascending: false })
          .limit(1);

        const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

        await admin.from("project_versions").insert({
          project_id: projectId,
          version_number: nextVersion,
          prompt,
          model_used: aiModel,
          generated_files: mergedFiles,
          output_json: { ...result, files: mergedFiles, projectName },
        });

        await admin.from("ai_messages").insert([
          { project_id: projectId, user_id: user.id, role: "user", content: prompt, model: aiModel },
          {
            project_id: projectId,
            user_id: user.id,
            role: "assistant",
            content: `${result.summary || "App actualizada"} (${result.changed_files.length} archivos · ${cost} créditos · ${tier})`,
            model: aiModel,
          },
        ]);
      }

      return jsonResponse({
        projectName,
        description: result.description || "",
        files: mergedFiles,
        changed_files: result.changed_files,
        summary: result.summary,
        dependencies: {},
        pages: [],
        components: [],
        _meta: {
          credits_used: cost,
          credits_remaining: creditCheck.isUnlimited ? -1 : creditCheck.balance,
          model: aiModel,
          tier,
          mode: "edit",
          changed_count: result.changed_files.length,
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
    console.error("chat-edit error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
