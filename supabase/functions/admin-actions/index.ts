import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Acceso denegado: se requiere rol admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "list_users": {
        const { data: profiles, error } = await adminClient
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;

        // Get roles for all users
        const { data: roles } = await adminClient
          .from("user_roles")
          .select("user_id, role");

        const roleMap: Record<string, string[]> = {};
        (roles ?? []).forEach((r: any) => {
          if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
          roleMap[r.user_id].push(r.role);
        });

        const users = (profiles ?? []).map((p: any) => ({
          ...p,
          role: (roleMap[p.id] ?? ["user"]).includes("admin") ? "admin" : "user",
        }));

        return new Response(JSON.stringify({ users }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_stats": {
        const { count: totalUsers } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true });

        const { count: totalProjects } = await adminClient
          .from("projects")
          .select("*", { count: "exact", head: true });

        const { data: creditData } = await adminClient
          .from("credit_transactions")
          .select("amount")
          .eq("type", "debit");

        const totalCreditsUsed = (creditData ?? []).reduce(
          (sum: number, t: any) => sum + (t.amount || 0),
          0
        );

        return new Response(
          JSON.stringify({
            stats: {
              total_users: totalUsers ?? 0,
              total_projects: totalProjects ?? 0,
              total_credits_used: totalCreditsUsed,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "assign_credits": {
        const { userId, amount, reason } = params;
        if (!userId || !amount || amount <= 0) {
          return new Response(JSON.stringify({ error: "userId y amount requeridos" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get current credits
        const { data: profile } = await adminClient
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update credits
        const { error: updateError } = await adminClient
          .from("profiles")
          .update({ credits: profile.credits + amount })
          .eq("id", userId);

        if (updateError) throw updateError;

        // Record transaction
        await adminClient.from("credit_transactions").insert({
          user_id: userId,
          type: "credit",
          amount,
          reason: reason || `Créditos asignados por admin`,
        });

        return new Response(
          JSON.stringify({ success: true, new_credits: profile.credits + amount }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "toggle_unlimited": {
        const { userId, unlimited } = params;
        if (!userId || typeof unlimited !== "boolean") {
          return new Response(JSON.stringify({ error: "userId y unlimited requeridos" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updateError } = await adminClient
          .from("profiles")
          .update({ is_unlimited: unlimited })
          .eq("id", userId);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "change_plan": {
        const { userId, plan } = params;
        if (!userId || !plan) {
          return new Response(JSON.stringify({ error: "userId y plan requeridos" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updateError } = await adminClient
          .from("profiles")
          .update({ plan })
          .eq("id", userId);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Acción desconocida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("admin-actions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
