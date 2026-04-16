import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CREDIT_COSTS: Record<string, number> = {
  simple_task: 2,
  simple_edit: 3,
  medium_module: 5,
  complex_module: 8,
  full_app: 12,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, mode } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "prompt requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple heuristic for cost estimation
    const words = prompt.trim().split(/\s+/).length;
    let complexity: string;

    if (mode === "edit") {
      complexity = words < 15 ? "simple_edit" : words < 40 ? "medium_module" : "complex_module";
    } else {
      complexity = words < 10 ? "simple_task" : words < 30 ? "medium_module" : words < 60 ? "complex_module" : "full_app";
    }

    const cost = CREDIT_COSTS[complexity] || CREDIT_COSTS.medium_module;

    // Check user credits
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();

    let canAfford = true;
    let currentCredits = 0;

    if (user) {
      const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: profile } = await adminClient
        .from("profiles")
        .select("credits, is_unlimited")
        .eq("id", user.id)
        .single();

      if (profile) {
        currentCredits = profile.credits;
        canAfford = profile.is_unlimited || profile.credits >= cost;
      }
    }

    return new Response(
      JSON.stringify({
        complexity,
        estimated_cost: cost,
        can_afford: canAfford,
        current_credits: currentCredits,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("estimate-cost error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
