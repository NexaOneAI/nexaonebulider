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
import { callAiProvider } from "../_shared/ai-router.ts";
import type { AiProvider, BuilderOutput } from "../_shared/types.ts";

/**
 * Maps a model id (e.g. "openai/gpt-5", "google/gemini-3-flash-preview",
 * "claude/claude-3-5-sonnet", "grok/grok-2") to an AiProvider.
 * Default: lovable (gateway).
 */
function inferProvider(model: string | undefined, override?: AiProvider): AiProvider {
  if (override) return override;
  const m = (model ?? "").toLowerCase();
  if (m.startsWith("openai/")) return "openai";
  if (m.startsWith("google/") || m.startsWith("gemini/")) return "gemini";
  if (m.startsWith("claude/") || m.startsWith("anthropic/")) return "claude";
  if (m.startsWith("grok/") || m.startsWith("xai/")) return "grok";
  return "lovable";
}

/**
 * Normalize BuilderOutput (files as Record<path,content>, dependencies as string[])
 * to the legacy shape used by project_versions / clients:
 *   files: Array<{ path, content, language }>
 *   dependencies: Record<name, version>
 */
function normalizeForStorage(output: BuilderOutput) {
  const filesArray = Object.entries(output.files ?? {}).map(([path, content]) => ({
    path,
    content,
    language: inferLanguage(path),
  }));

  const depsRecord: Record<string, string> = {};
  for (const dep of output.dependencies ?? []) {
    if (typeof dep !== "string") continue;
    const at = dep.lastIndexOf("@");
    if (at > 0) {
      depsRecord[dep.slice(0, at)] = dep.slice(at + 1);
    } else {
      depsRecord[dep] = "latest";
    }
  }

  return {
    projectName: output.projectName ?? "Mi proyecto",
    description: output.description ?? "",
    files: filesArray,
    dependencies: depsRecord,
    pages: [] as string[],
    components: [] as string[],
    previewCode: output.previewCode,
  };
}

function inferLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "tsx": return "typescript";
    case "ts": return "typescript";
    case "jsx": return "javascript";
    case "js": return "javascript";
    case "css": return "css";
    case "html": return "html";
    case "json": return "json";
    case "md": return "markdown";
    default: return "text";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, model, projectId, userTier, provider: providerOverride } = await req.json();

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
    const provider: AiProvider = inferProvider(aiModel, providerOverride as AiProvider | undefined);

    try {
      const output = await callAiProvider(provider, prompt, aiModel);
      const result = normalizeForStorage(output);

      if (!result.files || result.files.length === 0) {
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
        const previewCode = result.previewCode || generatePreviewSnapshot(result.files);

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
            content: `App generada con ${result.files.length} archivos (${cost} créditos · ${tier} · ${provider})`,
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
          provider,
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

function generatePreviewSnapshot(files: Array<{ path: string; content: string }>): string {
  const appFile = files.find((f) => f.path === "src/App.tsx" || f.path === "src/App.jsx");
  return appFile?.content?.substring(0, 5000) || "";
}
