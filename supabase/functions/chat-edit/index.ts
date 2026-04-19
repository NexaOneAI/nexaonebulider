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
import { parseSearchReplaceText, applyEdits } from "../_shared/searchReplace.ts";
import { buildProjectContext } from "../_shared/projectContext.ts";
import { classifyImageIntent } from "../_shared/imageIntent.ts";

const SYSTEM_PROMPT = `You are an expert React/TypeScript/Tailwind developer editing an existing app.

You receive:
1. The current files of the app
2. The recent conversation history
3. A new edit request

You MUST respond using the apply_edits tool. The tool returns a single string field "edits" formatted as Aider-style SEARCH/REPLACE blocks per file.

FORMAT — strictly follow it:

### path/to/file.tsx
ACTION: modify
LANG: tsx
<<<<<<< SEARCH
exact existing lines to find (must match the file byte-for-byte)
=======
new lines that replace them
>>>>>>> REPLACE

Rules:
- Use ACTION: modify | create | delete.
- For "create" you can omit SEARCH and put the full new content between markers (use one block with empty SEARCH).
- For "delete" do not include any SEARCH/REPLACE block.
- The SEARCH section MUST be copied exactly from the current file (same indentation, same whitespace). Keep it as small as possible but unique enough to match only one place.
- Output multiple blocks per file if you need several edits.
- DO NOT return full file contents when modifying. Only the SEARCH/REPLACE pairs.
- DO NOT wrap the output in markdown fences.
- Also return a one-sentence "summary" of what changed and (optionally) updated projectName / description.`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "apply_edits",
    description:
      "Return SEARCH/REPLACE blocks per changed file (Aider-style). Do NOT return full file contents.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "One-sentence summary of what changed" },
        projectName: { type: "string" },
        description: { type: "string" },
        edits: {
          type: "string",
          description:
            "Plain text containing one or more file sections in the format: '### path' + 'ACTION: ...' + 'LANG: ...' + SEARCH/REPLACE blocks.",
        },
      },
      required: ["summary", "edits"],
      additionalProperties: false,
    },
  },
};

function parseToolCall(data: any): {
  summary?: string;
  projectName?: string;
  description?: string;
  edits?: string;
} | null {
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      // fallthrough
    }
  }
  // Fallback: model returned plain text → treat full content as `edits`.
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.includes("<<<<<<< SEARCH")) {
    return { summary: "Edición aplicada", edits: content };
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY no configurada" }, 500);

  try {
    const { prompt, model, projectId, currentFiles, userTier, historyAfter } = await req.json();

    if (!prompt || typeof prompt !== "string")
      return jsonResponse({ error: "El prompt es requerido" }, 400);
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
      // Recent conversation context — capped at 10 most recent messages and
      // optionally filtered by a user-defined cutoff (when the user clicked
      // "Nueva conversación" in the UI).
      let history: Array<{ role: string; content: string }> = [];
      if (projectId) {
        let q = admin
          .from("ai_messages")
          .select("role, content")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (typeof historyAfter === "string" && historyAfter) {
          q = q.gt("created_at", historyAfter);
        }
        const { data: msgs } = await q;
        history = (msgs || []).reverse().map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));
      }

      const filesContext = currentFiles
        .map((f: any) => `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
        .join("\n\n");

      // Inject a structured project summary so the model gets a high-signal
      // overview (routes/components/design tokens) before the raw file dump.
      const projectContext = buildProjectContext(
        currentFiles.map((f: any) => ({ path: f.path, content: f.content })),
      );

      // Image intent detection — if the user asks for an image, generate it
      // first via /image-gen and inject the resulting public URL as extra
      // context so the model can reference it inside its SEARCH/REPLACE blocks.
      let generatedImage: { url: string; alt: string; placement: string } | null = null;
      try {
        const intent = await classifyImageIntent(prompt, LOVABLE_API_KEY);
        if (intent.needs_image && intent.description) {
          const authHeader = req.headers.get("Authorization") || "";
          const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
          const supaUrl = Deno.env.get("SUPABASE_URL")!;
          const imgResp = await fetch(`${supaUrl}/functions/v1/image-gen`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
              apikey,
            },
            body: JSON.stringify({
              prompt: intent.description,
              alt: intent.alt,
              projectId,
            }),
          });
          if (imgResp.ok) {
            const imgData = await imgResp.json();
            generatedImage = {
              url: imgData.url,
              alt: imgData.alt || intent.alt || intent.description,
              placement: intent.placement_hint || "inline",
            };
          } else {
            console.warn("image-gen failed in chat-edit:", imgResp.status, await imgResp.text());
          }
        }
      } catch (e) {
        console.warn("image intent flow failed:", e);
      }

      const imageContext = generatedImage
        ? `An image has been generated for this request and uploaded to public storage.\nUse it directly via an <img> tag (or as a CSS background-image url) — do NOT try to import it.\n\nURL: ${generatedImage.url}\nALT: ${generatedImage.alt}\nPLACEMENT HINT: ${generatedImage.placement}\n\nGuidelines:\n- Insert the <img> in the most relevant existing component (or create one if needed).\n- Always include alt="${generatedImage.alt.replace(/"/g, "'")}".\n- Use Tailwind classes that match the project's design tokens (rounded-lg, shadow-elegant, w-full, object-cover, etc).\n- For hero/background placements consider object-cover with a fixed aspect ratio.`
        : "";

      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: projectContext },
        ...(imageContext ? [{ role: "system", content: imageContext }] : []),
        {
          role: "user",
          content: `Current app files:\n\n${filesContext}\n\nReturn ONLY SEARCH/REPLACE blocks for what changes.`,
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
          tool_choice: { type: "function", function: { name: "apply_edits" } },
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
      const result = parseToolCall(data);

      if (!result || !result.edits) {
        if (!creditCheck.isUnlimited) {
          await refundCredits(admin, user.id, cost, "Respuesta inválida", aiModel, projectId);
        }
        return jsonResponse({ error: "No se pudo parsear la respuesta de la IA" }, 502);
      }

      const fileEdits = parseSearchReplaceText(result.edits);
      if (fileEdits.length === 0) {
        if (!creditCheck.isUnlimited) {
          await refundCredits(admin, user.id, cost, "Sin bloques SEARCH/REPLACE", aiModel, projectId);
        }
        return jsonResponse(
          { error: "La IA no devolvió bloques SEARCH/REPLACE válidos", raw: result.edits.slice(0, 500) },
          502,
        );
      }

      const applyResult = applyEdits(
        currentFiles.map((f: any) => ({ path: f.path, content: f.content, language: f.language })),
        fileEdits,
      );

      if (applyResult.applied === 0) {
        if (!creditCheck.isUnlimited) {
          await refundCredits(admin, user.id, cost, "Ningún bloque aplicó", aiModel, projectId);
        }
        return jsonResponse(
          {
            error: "Ningún bloque SEARCH coincidió con los archivos. La IA debe reintentar.",
            failed: applyResult.failed,
          },
          502,
        );
      }

      const mergedFiles = applyResult.files;
      const projectName = result.projectName || currentFiles[0]?.projectName || "Mi proyecto";
      const changedPaths = Array.from(new Set(fileEdits.map((e) => e.path)));

      await recordDebit(admin, user.id, cost, "Edición de app con IA (diffs)", aiModel, projectId, tier);

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
          output_json: {
            summary: result.summary,
            description: result.description,
            projectName,
            edits_meta: {
              applied: applyResult.applied,
              failed: applyResult.failed,
              changed_paths: changedPaths,
              bytes_saved: applyResult.bytesSaved,
            },
            files: mergedFiles,
          },
        });

        await admin.from("ai_messages").insert([
          { project_id: projectId, user_id: user.id, role: "user", content: prompt, model: aiModel },
          {
            project_id: projectId,
            user_id: user.id,
            role: "assistant",
            content: `${result.summary || "App actualizada"} · ${applyResult.applied} bloques aplicados en ${changedPaths.length} archivos · ${cost} créditos · ${tier}${
              applyResult.failed.length ? ` · ⚠️ ${applyResult.failed.length} bloques fallaron` : ""
            }`,
            model: aiModel,
          },
        ]);
      }

      return jsonResponse({
        projectName,
        description: result.description || "",
        files: mergedFiles,
        changed_paths: changedPaths,
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
          strategy: "search_replace",
          blocks_applied: applyResult.applied,
          blocks_failed: applyResult.failed,
          bytes_saved: applyResult.bytesSaved,
          changed_count: changedPaths.length,
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
