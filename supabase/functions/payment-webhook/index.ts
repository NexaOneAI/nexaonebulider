import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/auth.ts";

/**
 * payment-webhook: Receives Mercado Pago IPN notifications.
 * Validates x-signature, fetches payment, credits user on approval.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const WEBHOOK_SECRET = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

  if (!MP_TOKEN) return jsonResponse({ error: "MP token missing" }, 500);

  try {
    const url = new URL(req.url);
    const bodyText = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = {};
    }

    console.log("MP webhook received:", { type: body.type, action: body.action, dataId: body.data?.id });

    // 1. Validate x-signature (when secret configured)
    if (WEBHOOK_SECRET) {
      const xSignature = req.headers.get("x-signature");
      const xRequestId = req.headers.get("x-request-id");
      const dataId = body.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");

      if (xSignature && xRequestId && dataId) {
        const valid = await verifyMpSignature(xSignature, xRequestId, String(dataId), WEBHOOK_SECRET);
        if (!valid) {
          console.warn("MP signature invalid");
          return jsonResponse({ error: "Invalid signature" }, 401);
        }
      }
    }

    // Only process payment events
    const isPayment = body.type === "payment" || body.topic === "payment";
    if (!isPayment) {
      return jsonResponse({ received: true, ignored: true });
    }

    const paymentId = body.data?.id || body.resource?.split("/").pop();
    if (!paymentId) return jsonResponse({ received: true, error: "no payment id" });

    // 2. Fetch payment from MP
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });

    if (!paymentRes.ok) {
      console.error("MP payment fetch failed:", paymentRes.status);
      return jsonResponse({ received: true, error: "fetch failed" }, 200);
    }

    const payment = await paymentRes.json();
    const purchaseId = payment.external_reference;
    const status = payment.status; // approved | pending | rejected | refunded

    if (!purchaseId) {
      return jsonResponse({ received: true, error: "no external_reference" });
    }

    const admin = getAdminClient();

    // 3. Lookup pending purchase (idempotency)
    const { data: purchase } = await admin
      .from("purchases")
      .select("*")
      .eq("id", purchaseId)
      .single();

    if (!purchase) return jsonResponse({ received: true, error: "purchase not found" });

    // Idempotency guard
    if (purchase.payment_status === "completed") {
      return jsonResponse({ received: true, already_processed: true });
    }

    // 4. Map MP status → our status
    let newStatus: "completed" | "failed" | "pending" | "refunded" = "pending";
    if (status === "approved") newStatus = "completed";
    else if (status === "rejected" || status === "cancelled") newStatus = "failed";
    else if (status === "refunded" || status === "charged_back") newStatus = "refunded";

    await admin
      .from("purchases")
      .update({
        payment_status: newStatus,
        external_payment_id: String(paymentId),
      })
      .eq("id", purchase.id);

    // 5. Credit user only on approval
    if (newStatus === "completed") {
      const { data: profile } = await admin
        .from("profiles")
        .select("credits")
        .eq("id", purchase.user_id)
        .single();

      const newBalance = (profile?.credits || 0) + purchase.credits;

      await admin
        .from("profiles")
        .update({ credits: newBalance })
        .eq("id", purchase.user_id);

      await admin.from("credit_transactions").insert({
        user_id: purchase.user_id,
        type: "credit",
        amount: purchase.credits,
        reason: `Compra: ${purchase.package_name} (MP ${paymentId})`,
      });

      console.log(`✓ Credited ${purchase.credits} to user ${purchase.user_id}, balance: ${newBalance}`);
    }

    return jsonResponse({ received: true, status: newStatus });
  } catch (error) {
    console.error("payment-webhook error:", error);
    // MP retries on non-2xx, so we still return 200 to avoid storms unless fatal
    return jsonResponse({ received: true, error: error instanceof Error ? error.message : "unknown" });
  }
});

async function verifyMpSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string,
): Promise<boolean> {
  // x-signature format: ts=NNNN,v1=HHHH
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, v] = p.trim().split("=");
      return [k, v];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === v1;
}
