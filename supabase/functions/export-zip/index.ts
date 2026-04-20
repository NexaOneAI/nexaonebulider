import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore — JSZip via esm
import JSZip from "https://esm.sh/jszip@3.10.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser, getAdminClient } from "../_shared/auth.ts";
import { buildScaffoldFiles, slugify } from "../_shared/projectScaffold.ts";

/**
 * export-zip: Server-side ZIP generation. Builds a complete Vite+React+TS project,
 * uploads to app-exports bucket, returns a signed URL.
 *
 * The Vite/Tailwind/TS scaffold is shared with `github-sync` via
 * `_shared/projectScaffold.ts` so the ZIP and the GitHub repo always
 * contain the same file set.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, projectName, files } = await req.json();
    if (!Array.isArray(files) || files.length === 0) {
      return jsonResponse({ error: "files es requerido" }, 400);
    }

    const { user, error: authError } = await requireUser(req);
    if (authError || !user) return jsonResponse({ error: authError }, 401);

    const admin = getAdminClient();
    const slug = slugify(projectName || "mi-proyecto");

    // Build ZIP — generated files first
    const zip = new JSZip();
    for (const f of files) {
      zip.file(f.path, f.content);
    }

    // Then inject the standard scaffold (skips paths already present)
    const present = new Set(files.map((f: any) => f.path));
    for (const sf of buildScaffoldFiles(projectName || slug, present)) {
      zip.file(sf.path, sf.content);
    }

    const buf: Uint8Array = await zip.generateAsync({ type: "uint8array" });

    // Upload to storage: <user_id>/<projectId>-<timestamp>.zip
    const ts = Date.now();
    const storagePath = `${user.id}/${projectId || "unsaved"}-${ts}.zip`;

    const { error: uploadError } = await admin.storage
      .from("app-exports")
      .upload(storagePath, buf, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      console.error("upload error:", uploadError);
      return jsonResponse({ error: "Error subiendo ZIP" }, 500);
    }

    // Signed URL valid for 1 hour
    const { data: signed } = await admin.storage
      .from("app-exports")
      .createSignedUrl(storagePath, 3600);

    if (!signed?.signedUrl) {
      return jsonResponse({ error: "Error generando URL firmada" }, 500);
    }

    // Record export
    if (projectId) {
      await admin.from("app_exports").insert({
        project_id: projectId,
        user_id: user.id,
        export_type: "zip",
        zip_url: storagePath,
      });
    }

    return jsonResponse({
      success: true,
      url: signed.signedUrl,
      path: storagePath,
      sizeBytes: buf.length,
      fileCount: files.length,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("export-zip error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
