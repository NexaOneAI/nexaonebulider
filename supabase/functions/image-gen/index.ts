import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser, getAdminClient } from "../_shared/auth.ts";

/**
 * image-gen
 *
 * Generates an image via the Lovable AI Gateway (google/gemini-2.5-flash-image,
 * a.k.a. Nano banana), uploads it to the public `project-assets` bucket under
 * `<user_id>/<project_id?>/<filename>` and returns the public URL.
 *
 * Charges a fixed cost of 4 credits per generation. On any failure after the
 * deduction we refund the user (unless they're unlimited).
 *
 * Body: {
 *   prompt: string,
 *   projectId?: string,
 *   model?: string,
 *   alt?: string,
 *   baseImageUrl?: string  // when present → edit mode (passes the URL as part of the message)
 * }
 * Resp: { url, path, alt, model, credits_used, credits_remaining }
 */

const IMAGE_MODEL_DEFAULT = "google/gemini-2.5-flash-image";
const IMAGE_COST = 4;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Formato de imagen inválido (no data URL)");
  const mime = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "png";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY no configurada" }, 500);

  try {
    const { prompt, projectId, model, alt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return jsonResponse({ error: "El prompt es requerido" }, 400);
    }

    const { user, error: authError } = await requireUser(req);
    if (authError || !user) return jsonResponse({ error: authError }, 401);

    const admin = getAdminClient();

    // Deduct credits first.
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("credits, is_unlimited")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr || !profile) {
      return jsonResponse({ error: "Perfil no encontrado" }, 404);
    }
    const isUnlimited = !!profile.is_unlimited;
    if (!isUnlimited && (profile.credits ?? 0) < IMAGE_COST) {
      return jsonResponse(
        { error: "Créditos insuficientes", credits_required: IMAGE_COST, credits_available: profile.credits ?? 0 },
        402,
      );
    }
    if (!isUnlimited) {
      await admin
        .from("profiles")
        .update({ credits: (profile.credits ?? 0) - IMAGE_COST })
        .eq("id", user.id);
    }

    const aiModel = (model && typeof model === "string") ? model : IMAGE_MODEL_DEFAULT;

    const refund = async (reason: string) => {
      if (isUnlimited) return;
      await admin.from("credit_transactions").insert({
        user_id: user.id,
        amount: IMAGE_COST,
        type: "refund",
        reason,
        model: aiModel,
        project_id: projectId ?? null,
      });
      await admin
        .from("profiles")
        .update({ credits: (profile.credits ?? 0) })
        .eq("id", user.id);
    };

    let aiResp: Response;
    try {
      aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
    } catch (e) {
      await refund("Error de red al generar imagen");
      throw e;
    }

    if (!aiResp.ok) {
      await refund(`AI gateway ${aiResp.status}`);
      if (aiResp.status === 429) return jsonResponse({ error: "Demasiadas solicitudes." }, 429);
      if (aiResp.status === 402) return jsonResponse({ error: "Créditos de IA agotados." }, 402);
      const errText = await aiResp.text();
      console.error("image-gen gateway error:", aiResp.status, errText);
      return jsonResponse({ error: `AI gateway error: ${aiResp.status}` }, 502);
    }

    const data = await aiResp.json();
    const dataUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) {
      await refund("Respuesta sin imagen");
      return jsonResponse({ error: "La IA no devolvió una imagen" }, 502);
    }

    let bytes: Uint8Array, mime: string;
    try {
      ({ bytes, mime } = dataUrlToBytes(dataUrl));
    } catch (e) {
      await refund("Imagen inválida");
      throw e;
    }

    const ext = extFromMime(mime);
    const slug = slugify(prompt);
    const ts = Date.now();
    const folder = projectId ? `${user.id}/${projectId}` : user.id;
    const path = `${folder}/${slug}-${ts}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("project-assets")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) {
      await refund(`Error de storage: ${upErr.message}`);
      return jsonResponse({ error: `No se pudo subir la imagen: ${upErr.message}` }, 500);
    }

    const { data: pub } = admin.storage.from("project-assets").getPublicUrl(path);
    const url = pub.publicUrl;

    // Record debit transaction (success path).
    if (!isUnlimited) {
      await admin.from("credit_transactions").insert({
        user_id: user.id,
        amount: -IMAGE_COST,
        type: "debit",
        reason: "Generación de imagen con IA",
        model: aiModel,
        project_id: projectId ?? null,
      });
    }

    const remaining = isUnlimited ? -1 : Math.max(0, (profile.credits ?? 0) - IMAGE_COST);
    return jsonResponse({
      url,
      path,
      alt: typeof alt === "string" && alt ? alt : prompt.slice(0, 120),
      model: aiModel,
      credits_used: IMAGE_COST,
      credits_remaining: remaining,
    });
  } catch (error) {
    console.error("image-gen error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
