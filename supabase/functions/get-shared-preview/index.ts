/**
 * Public endpoint that returns the compiled HTML preview of a shared project.
 *
 * - No auth required (verify_jwt = false in config.toml).
 * - Reads `project_shares` by token, follows pinned_version_id or falls
 *   back to the latest version of the project.
 * - Increments view_count via RPC.
 * - Responds with text/html so it can be served directly inside an iframe.
 *
 * Usage from the SPA route /share/:token:
 *   <iframe src="https://<project>.supabase.co/functions/v1/get-shared-preview?token=XYZ" />
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function htmlError(status: number, title: string, message: string): Response {
  const body = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #0f172a; color: #e2e8f0; min-height: 100vh; margin: 0;
         display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .box { max-width: 420px; text-align: center; }
  h1 { font-size: 4rem; margin: 0 0 .5rem; color: #f97316; font-weight: 700; }
  h2 { font-size: 1.25rem; margin: 0 0 1rem; color: #fafafa; }
  p { color: #94a3b8; line-height: 1.6; }
</style>
</head>
<body>
  <div class="box">
    <h1>${status}</h1>
    <h2>${title}</h2>
    <p>${message}</p>
  </div>
</body>
</html>`;
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Token can come from ?token=… or as the last path segment (/get-shared-preview/abc)
  const url = new URL(req.url);
  let token = url.searchParams.get("token") || "";
  if (!token) {
    const segs = url.pathname.split("/").filter(Boolean);
    const last = segs[segs.length - 1] || "";
    if (last && last !== "get-shared-preview") token = last;
  }

  // Validate token shape: 32-128 hex/url-safe chars
  if (!token || !/^[A-Za-z0-9_-]{16,128}$/.test(token)) {
    return htmlError(400, "Token inválido", "El enlace de share no es válido.");
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Look up the share
    const { data: share, error: shareErr } = await supabase
      .from("project_shares")
      .select("id, project_id, enabled, pinned_version_id")
      .eq("token", token)
      .maybeSingle();

    if (shareErr) {
      console.error("[get-shared-preview] share lookup error:", shareErr);
      return htmlError(500, "Error interno", "No pudimos cargar este preview.");
    }
    if (!share) {
      return htmlError(404, "No encontrado", "Este enlace ya no existe.");
    }
    if (!share.enabled) {
      return htmlError(404, "Pausado", "Este enlace está pausado por su autor.");
    }

    // 2) Resolve which version to serve
    let versionQuery = supabase
      .from("project_versions")
      .select("preview_code, model_used")
      .eq("project_id", share.project_id);

    if (share.pinned_version_id) {
      versionQuery = versionQuery.eq("id", share.pinned_version_id);
    } else {
      versionQuery = versionQuery
        .order("version_number", { ascending: false })
        .limit(1);
    }

    const { data: versions, error: versionErr } = await versionQuery;
    if (versionErr) {
      console.error("[get-shared-preview] version lookup error:", versionErr);
      return htmlError(500, "Error interno", "No pudimos cargar la versión.");
    }
    const version = versions?.[0];
    if (!version || !version.preview_code) {
      return htmlError(
        404,
        "Sin contenido",
        "Este proyecto aún no tiene una versión publicable.",
      );
    }

    // 3) Increment view counter (best-effort; never block the response)
    supabase
      .rpc("increment_share_view", { _token: token })
      .then(({ error }) => {
        if (error) console.warn("[get-shared-preview] view++ failed:", error);
      });

    return new Response(version.preview_code, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=30",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (e) {
    console.error("[get-shared-preview] unexpected:", e);
    return htmlError(500, "Error inesperado", "Algo salió mal.");
  }
});
