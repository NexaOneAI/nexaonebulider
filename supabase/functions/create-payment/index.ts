import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * create-payment: Creates a payment intent for credit packages.
 * Currently a stub — integrate with Stripe/MercadoPago when ready.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    const { packageId, packageName, credits, amountMxn } = await req.json();

    if (!packageId || !credits || !amountMxn) {
      return new Response(
        JSON.stringify({ error: "packageId, credits, and amountMxn are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create purchase record
    const { data: purchase, error: purchaseError } = await adminClient
      .from("purchases")
      .insert({
        user_id: user.id,
        package_name: packageName || packageId,
        credits,
        amount_mxn: amountMxn,
        payment_status: "pending",
        payment_provider: "manual",
      })
      .select()
      .single();

    if (purchaseError) {
      return new Response(
        JSON.stringify({ error: "Error creating purchase record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For now, auto-complete the payment (manual mode)
    // In production, integrate with Stripe/MercadoPago here
    await adminClient
      .from("purchases")
      .update({ payment_status: "completed" })
      .eq("id", purchase.id);

    // Add credits
    const { data: profile } = await adminClient
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    await adminClient
      .from("profiles")
      .update({ credits: (profile?.credits || 0) + credits })
      .eq("id", user.id);

    // Record transaction
    await adminClient.from("credit_transactions").insert({
      user_id: user.id,
      type: "credit",
      amount: credits,
      reason: `Compra: ${packageName || packageId}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        purchaseId: purchase.id,
        creditsAdded: credits,
        newBalance: (profile?.credits || 0) + credits,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-payment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
