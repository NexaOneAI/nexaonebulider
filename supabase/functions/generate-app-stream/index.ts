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
import { createLovableStream } from "../_shared/providers/lovable-stream.ts";
import { parseAIResponse } from "../_shared/parser.ts";
import type { BuilderOutput } from "../_shared/types.ts";

const sseHeaders = {
  ...corsHeaders,
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  "Connection": "keep-alive",
  "X-Accel-Buffering": "no",
};

function inferLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "tsx":
    case "ts":
      return "typescript";
    case "jsx":
    case "js":
      return "javascript";
    case "css":
      return "css";
    case "html":
      return "html";
    case "json":
      return "json";
    case "md":
      return "markdown";
    default:
      return "text";
  }
}

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

function tryParseJson(content: string): BuilderOutput | null {
  // Try via shared parser first (handles markdown fences, tool_calls, etc.)
  const viaShared = parseAIResponse({ choices: [{ message: { content } }] });
  if (viaShared && typeof viaShared === "object") return viaShared as BuilderOutput;

  // Fallback: extract first {...}
  const cleaned = content.replace(/```(?:json)?/gi, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last <= first) return null;
  try {
    return JSON.parse(cleaned.slice(first, last + 1)) as BuilderOutput;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body inválido (JSON requerido)" }, 400);
  }

  const prompt = String(body.prompt ?? "").trim();
  const model = String(body.model ?? "google/gemini-3-flash-preview");
  const projectId = body.projectId ? String(body.projectId) : null;
  const userTier = body.userTier as Tier | undefined;

  if (!prompt) return jsonResponse({ error: "El prompt es requerido" }, 400);

  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return jsonResponse({ error: authError }, 401);

  const admin = getAdminClient();
  const tier: Tier = classifyTier(prompt, "create", userTier);
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

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    if (!creditCheck.isUnlimited) {
      await refundCredits(admin, user.id, cost, "Lovable Gateway no configurado", model, projectId);
    }
    return jsonResponse({ error: "LOVABLE_API_KEY no configurada" }, 500);
  }

  const { stream, finalContent } = createLovableStream({ prompt, model, apiKey });

  // Side-effect: when stream finishes, persist version + record debit.
  // Errors here are surfaced via the stream's `error` event (already sent
  // by createLovableStream); we still attempt persistence on success.
  finalContent
    .then(async (result) => {
      if (!result.ok) {
        if (!creditCheck.isUnlimited) {
          await refundCredits(admin, user.id, cost, result.error, model, projectId);
        }
        return;
      }
      const parsed = tryParseJson(result.content);
      if (!parsed || !parsed.files || Object.keys(parsed.files).length === 0) {
        if (!creditCheck.isUnlimited) {
          await refundCredits(admin, user.id, cost, "Respuesta no parseable", model, projectId);
        }
        return;
      }

      await recordDebit(admin, user.id, cost, "Generación de app con IA (stream)", model, projectId, tier);
      const normalized = normalizeForStorage(parsed);

      if (projectId) {
        const { data: versions } = await admin
          .from("project_versions")
          .select("version_number")
          .eq("project_id", projectId)
          .order("version_number", { ascending: false })
          .limit(1);
        const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;
        const previewCode =
          normalized.previewCode ||
          (normalized.files.find((f) => f.path === "src/App.tsx")?.content?.slice(0, 5000) ?? "");

        await admin.from("project_versions").insert({
          project_id: projectId,
          version_number: nextVersion,
          prompt,
          model_used: model,
          generated_files: normalized.files,
          output_json: normalized,
          preview_code: previewCode,
        });
        await admin
          .from("projects")
          .update({ status: "active", name: normalized.projectName || undefined })
          .eq("id", projectId);
        await admin.from("ai_messages").insert([
          { project_id: projectId, user_id: user.id, role: "user", content: prompt, model },
          {
            project_id: projectId,
            user_id: user.id,
            role: "assistant",
            content: `App generada (stream) con ${normalized.files.length} archivos (${cost} créditos · ${tier}).`,
            model,
          },
        ]);
      }
    })
    .catch((e) => {
      console.error("generate-app-stream persistence error:", e);
    });

  return new Response(stream, { headers: sseHeaders });
});
