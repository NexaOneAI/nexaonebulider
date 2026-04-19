/**
 * Streaming variant of /chat-edit. Pipes Server-Sent Events to the client
 * with both raw tokens and *parsed SEARCH/REPLACE blocks* as soon as each
 * one closes, so the UI can apply them progressively.
 *
 * Events:
 *   event: token  data: { delta }
 *   event: block  data: { path, action, language?, search, replace, index }
 *   event: done   data: { full, summary?, applied, failed, bytes_saved, changed_paths }
 *   event: error  data: { message }
 *
 * Server still re-parses the assembled output at the end and authoritatively
 * persists the new version + ai_messages + credits. The block events are
 * advisory for UX only — server is the source of truth.
 */

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
import { createLovableEditStream } from "../_shared/providers/lovable-edit-stream.ts";
import { sse, makeSafeController } from "../_shared/providers/_sse-utils.ts";
import { buildProjectContext } from "../_shared/projectContext.ts";
import { classifyImageIntent } from "../_shared/imageIntent.ts";

const SYSTEM_PROMPT = `You are an expert React/TypeScript/Tailwind developer editing an existing app.

You receive:
1. The current files of the app
2. The recent conversation history
3. A new edit request

Respond with Aider-style SEARCH/REPLACE blocks in plain text. NO markdown fences. NO JSON.

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
- For "create" use one block with empty SEARCH and the full new file content as REPLACE.
- For "delete" do NOT include any SEARCH/REPLACE block.
- The SEARCH section MUST match the file exactly (whitespace, indentation). Keep it minimal but unique.
- Output multiple blocks per file if needed.
- DO NOT return full file contents when modifying.
- DO NOT wrap output in markdown fences.
- After all blocks, finish with a "### __SUMMARY__" section containing one short sentence on a single line.`;

const sseHeaders = {
  ...corsHeaders,
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  "Connection": "keep-alive",
  "X-Accel-Buffering": "no",
};

function extractSummary(full: string): string | undefined {
  const m = full.match(/###\s*__SUMMARY__\s*\n([^\n]+)/);
  return m?.[1]?.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY no configurada" }, 500);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body inválido" }, 400);
  }

  const prompt = String(body.prompt ?? "").trim();
  const model = String(body.model ?? "google/gemini-3-flash-preview");
  const projectId = body.projectId ? String(body.projectId) : null;
  const userTier = body.userTier as Tier | undefined;
  const historyAfter = typeof body.historyAfter === "string" ? body.historyAfter : null;
  const currentFiles: Array<{ path: string; content: string; language: string }> =
    Array.isArray(body.currentFiles) ? body.currentFiles : [];

  if (!prompt) return jsonResponse({ error: "El prompt es requerido" }, 400);
  if (currentFiles.length === 0) return jsonResponse({ error: "currentFiles es requerido" }, 400);

  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return jsonResponse({ error: authError }, 401);

  const admin = getAdminClient();
  const tier: Tier = classifyTier(prompt, "edit", userTier);
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

  // Recent conversation context — last 10 messages, optionally filtered by
  // a per-project cutoff sent by the client when the user opens a new
  // conversation in the UI.
  let history: Array<{ role: string; content: string }> = [];
  if (projectId) {
    let q = admin
      .from("ai_messages")
      .select("role, content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (historyAfter) q = q.gt("created_at", historyAfter);
    const { data: msgs } = await q;
    history = (msgs || []).reverse().map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  }

  const filesContext = currentFiles
    .map((f) => `### ${f.path}\n\`\`\`${f.language || "text"}\n${f.content}\n\`\`\``)
    .join("\n\n");

  // Project-wide structured summary (routes, components, design tokens).
  const projectContext = buildProjectContext(
    currentFiles.map((f) => ({ path: f.path, content: f.content })),
  );

  // Image intent — generate ahead of streaming so the model can reference
  // the URL in its SEARCH/REPLACE blocks. We tolerate any failure here:
  // the rest of the edit pipeline runs regardless.
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
        console.warn("image-gen failed in chat-edit-stream:", imgResp.status, await imgResp.text());
      }
    }
  } catch (e) {
    console.warn("image intent flow failed (stream):", e);
  }

  const imageContext = generatedImage
    ? `An image has been generated for this request and uploaded to public storage.\nUse it directly via an <img> tag (or as a CSS background-image url) — do NOT try to import it.\n\nURL: ${generatedImage.url}\nALT: ${generatedImage.alt}\nPLACEMENT HINT: ${generatedImage.placement}\n\nGuidelines:\n- Insert the <img> in the most relevant existing component (or create one if needed).\n- Always include alt="${generatedImage.alt.replace(/"/g, "'")}".\n- Use Tailwind classes that match the project's design tokens (rounded-lg, shadow-elegant, w-full, object-cover, etc).\n- For hero/background placements consider object-cover with a fixed aspect ratio.`
    : "";

  const inner = createLovableEditStream({
    prompt,
    model,
    apiKey: LOVABLE_API_KEY,
    systemPrompt: SYSTEM_PROMPT,
    filesContext,
    history,
    extraSystem: [projectContext, ...(imageContext ? [imageContext] : [])],
  });

  // Wrap inner stream so we can append a final "done" event with persistence
  // metadata (applied/failed/bytes_saved/summary). Inner stream emits its own
  // `done` already; we forward its raw events then append a meta-rich `done`.
  const wrapped = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safe = makeSafeController(controller);
      const reader = inner.stream.getReader();
      const decoder = new TextDecoder();
      let textBuf = "";

      // Surface generated image immediately so the UI can show it before
      // the model finishes emitting blocks.
      if (generatedImage) {
        safe.enqueue(sse("image", generatedImage));
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuf += decoder.decode(value, { stream: true });
          // Forward chunks as-is; we only add an extra event at the very end.
          // Strip inner `done` so we can replace it with our richer one.
          let idx: number;
          while ((idx = textBuf.indexOf("\n\n")) !== -1) {
            const frame = textBuf.slice(0, idx + 2);
            textBuf = textBuf.slice(idx + 2);
            if (frame.startsWith("event: done")) continue; // swallow
            safe.enqueue(frame);
          }
        }

        const finalRes = await inner.finalContent;
        if (!finalRes.ok) {
          if (!creditCheck.isUnlimited) {
            await refundCredits(admin, user.id, cost, finalRes.error, model, projectId);
          }
          safe.enqueue(sse("error", { message: finalRes.error }));
          safe.close();
          return;
        }

        const fullContent = finalRes.content;
        const fileEdits = parseSearchReplaceText(fullContent);

        if (fileEdits.length === 0) {
          if (!creditCheck.isUnlimited) {
            await refundCredits(admin, user.id, cost, "Sin bloques SEARCH/REPLACE", model, projectId);
          }
          safe.enqueue(
            sse("error", { message: "La IA no devolvió bloques SEARCH/REPLACE válidos" }),
          );
          safe.close();
          return;
        }

        const applyResult = applyEdits(currentFiles, fileEdits);
        if (applyResult.applied === 0) {
          if (!creditCheck.isUnlimited) {
            await refundCredits(admin, user.id, cost, "Ningún bloque aplicó", model, projectId);
          }
          safe.enqueue(
            sse("error", {
              message: "Ningún bloque SEARCH coincidió con los archivos",
              failed: applyResult.failed,
            }),
          );
          safe.close();
          return;
        }

        const summary = extractSummary(fullContent) || "App actualizada";
        const changedPaths = Array.from(new Set(fileEdits.map((e) => e.path)));

        await recordDebit(
          admin,
          user.id,
          cost,
          "Edición de app con IA (stream + diffs)",
          model,
          projectId,
          tier,
        );

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
            model_used: model,
            generated_files: applyResult.files,
            output_json: {
              summary,
              projectName: currentFiles[0]?.path ? undefined : "Mi proyecto",
              edits_meta: {
                applied: applyResult.applied,
                failed: applyResult.failed,
                changed_paths: changedPaths,
                bytes_saved: applyResult.bytesSaved,
                strategy: "search_replace_stream",
              },
              files: applyResult.files,
            },
          });

          await admin.from("ai_messages").insert([
            { project_id: projectId, user_id: user.id, role: "user", content: prompt, model },
            {
              project_id: projectId,
              user_id: user.id,
              role: "assistant",
              content: `${summary} · ${applyResult.applied} bloques aplicados en ${changedPaths.length} archivos · ${cost} créditos · ${tier}${
                applyResult.failed.length ? ` · ⚠️ ${applyResult.failed.length} bloques fallaron` : ""
              }${generatedImage ? ` · 🖼️ imagen generada` : ""}`,
              model,
            },
          ]);
        }

        safe.enqueue(
          sse("done", {
            full: fullContent,
            summary,
            applied: applyResult.applied,
            failed: applyResult.failed,
            bytes_saved: applyResult.bytesSaved,
            changed_paths: changedPaths,
            files: applyResult.files,
            credits_used: cost,
            credits_remaining: creditCheck.isUnlimited ? -1 : creditCheck.balance,
            tier,
            generated_image: generatedImage,
          }),
        );
        safe.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error";
        if (!creditCheck.isUnlimited) {
          await refundCredits(admin, user.id, cost, message, model, projectId);
        }
        safe.enqueue(sse("error", { message }));
        safe.close();
      }
    },
  });

  return new Response(wrapped, { headers: sseHeaders });
});
