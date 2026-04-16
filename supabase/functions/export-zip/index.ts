import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * export-zip: Generate a ZIP file from project files (client-side).
 * This edge function exists for future server-side ZIP generation
 * (e.g., adding node_modules, running builds, etc.)
 * 
 * For now, ZIP export is handled client-side via JSZip.
 * This function serves as a placeholder for the server-side version.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, files, projectName } = await req.json();

    if (!files || !Array.isArray(files)) {
      return new Response(
        JSON.stringify({ error: "Files array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the files structure for client-side ZIP generation
    // In the future, this could generate the ZIP server-side
    return new Response(
      JSON.stringify({
        success: true,
        message: "Use client-side JSZip for export",
        projectName,
        fileCount: files.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("export-zip error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
