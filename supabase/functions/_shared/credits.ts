import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const CREDIT_TIERS = {
  simple_task: 2,
  simple_edit: 3,
  medium_module: 5,
  complex_module: 8,
  full_app: 12,
} as const;

export type Tier = keyof typeof CREDIT_TIERS;

/**
 * Heuristic classifier — runs server-side to confirm/correct user-selected tier.
 * Returns the FINAL tier to charge.
 */
export function classifyTier(prompt: string, mode: "create" | "edit", userTier?: Tier): Tier {
  // If user explicitly chose a tier, respect it (it's their override)
  if (userTier && CREDIT_TIERS[userTier]) return userTier;

  const p = prompt.toLowerCase();
  const len = prompt.length;

  // Edit shortcuts
  if (mode === "edit") {
    if (len < 80 && /(cambia|cambiar|color|texto|título|titulo|font|tipo de letra|padding|margen|espacio)/.test(p)) {
      return "simple_edit";
    }
    if (len < 250) return "medium_module";
    return "complex_module";
  }

  // Create
  if (/(landing|landing page|saas|completa|completo|dashboard.*completo|app completa|sistema)/.test(p)) {
    return "full_app";
  }
  if (/(dashboard|admin|crud|módulo|modulo|sistema|panel)/.test(p)) {
    return "complex_module";
  }
  if (len < 80) return "simple_task";
  if (len < 200) return "medium_module";
  return "complex_module";
}

export async function checkCreditsAndDeduct(
  admin: SupabaseClient,
  userId: string,
  cost: number,
): Promise<{ ok: true; balance: number; isUnlimited: boolean } | { ok: false; error: string; status: number; available?: number; required?: number }> {
  const { data: profile } = await admin
    .from("profiles")
    .select("credits, is_unlimited")
    .eq("id", userId)
    .single();

  if (!profile) return { ok: false, error: "Perfil no encontrado", status: 404 };
  if (profile.is_unlimited) return { ok: true, balance: profile.credits, isUnlimited: true };
  if (profile.credits < cost) {
    return {
      ok: false,
      status: 402,
      error: `Créditos insuficientes. Necesitas ${cost}, tienes ${profile.credits}.`,
      available: profile.credits,
      required: cost,
    };
  }

  const { error: deductError } = await admin
    .from("profiles")
    .update({ credits: profile.credits - cost })
    .eq("id", userId);

  if (deductError) return { ok: false, error: "Error al descontar créditos", status: 500 };
  return { ok: true, balance: profile.credits - cost, isUnlimited: false };
}

export async function refundCredits(
  admin: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  model?: string,
  projectId?: string | null,
) {
  const { data: profile } = await admin
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  if (!profile) return;
  await admin.from("profiles").update({ credits: profile.credits + amount }).eq("id", userId);
  await admin.from("credit_transactions").insert({
    user_id: userId,
    type: "refund",
    amount,
    reason: `Rollback: ${reason}`,
    model: model || null,
    project_id: projectId || null,
  });
}

export async function recordDebit(
  admin: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  model: string,
  projectId?: string | null,
  tier?: string,
) {
  await admin.from("credit_transactions").insert({
    user_id: userId,
    type: "debit",
    amount,
    reason: tier ? `${reason} [${tier}]` : reason,
    model,
    project_id: projectId || null,
  });
}
