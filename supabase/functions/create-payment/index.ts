import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser, getAdminClient } from "../_shared/auth.ts";

/**
 * create-payment: Creates a Mercado Pago Checkout Pro preference.
 * Returns init_point URL for redirect.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  if (!MP_TOKEN) return jsonResponse({ error: "MERCADOPAGO_ACCESS_TOKEN no configurado" }, 500);

  try {
    const { packageId, packageName, credits, amountMxn, returnUrl } = await req.json();
    if (!packageId || !credits || !amountMxn) {
      return jsonResponse({ error: "packageId, credits, y amountMxn son requeridos" }, 400);
    }

    const { user, error: authError } = await requireUser(req);
    if (authError || !user) return jsonResponse({ error: authError }, 401);

    const admin = getAdminClient();

    // 1. Create pending purchase
    const { data: purchase, error: purchaseError } = await admin
      .from("purchases")
      .insert({
        user_id: user.id,
        package_name: packageName || packageId,
        credits,
        amount_mxn: amountMxn,
        payment_status: "pending",
        payment_provider: "mercadopago",
      })
      .select()
      .single();

    if (purchaseError || !purchase) {
      console.error("purchase insert error:", purchaseError);
      return jsonResponse({ error: "Error creando registro de compra" }, 500);
    }

    // 2. Build MP preference
    const isSandbox = MP_TOKEN.startsWith("TEST-");
    const baseReturn = returnUrl || `${new URL(req.url).origin.replace("/functions/v1/create-payment", "")}/billing`;
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`;

    const preference = {
      items: [
        {
          id: packageId,
          title: `Nexa One — ${packageName || packageId}`,
          description: `${credits} créditos para Nexa One Builder`,
          quantity: 1,
          currency_id: "MXN",
          unit_price: Number(amountMxn),
        },
      ],
      payer: { email: user.email },
      external_reference: purchase.id,
      notification_url: webhookUrl,
      back_urls: {
        success: `${baseReturn}?status=success&purchase=${purchase.id}`,
        failure: `${baseReturn}?status=failure&purchase=${purchase.id}`,
        pending: `${baseReturn}?status=pending&purchase=${purchase.id}`,
      },
      auto_return: "approved",
      metadata: {
        user_id: user.id,
        purchase_id: purchase.id,
        credits,
      },
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("MP preference error:", mpResponse.status, errText);
      await admin.from("purchases").update({ payment_status: "failed" }).eq("id", purchase.id);
      return jsonResponse({ error: "Error creando preferencia de pago" }, 502);
    }

    const mpData = await mpResponse.json();

    // 3. Save MP preference id as external_payment_id
    await admin
      .from("purchases")
      .update({ external_payment_id: mpData.id })
      .eq("id", purchase.id);

    return jsonResponse({
      success: true,
      purchaseId: purchase.id,
      preferenceId: mpData.id,
      checkoutUrl: isSandbox ? mpData.sandbox_init_point : mpData.init_point,
      sandbox: isSandbox,
    });
  } catch (error) {
    console.error("create-payment error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
