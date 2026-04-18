import { supabase } from "@/integrations/supabase/client";
import type {
  GenerateAppInput,
  GenerateAppResult,
  GenerateAppRequest,
  BuilderOutput,
  AiActionKey,
} from "./aiTypes";

/**
 * Calls the `estimate-cost` edge function with an explicit actionKey.
 * For prompt-based heuristic estimation, prefer `estimateService.estimateCost(prompt, mode)`.
 */
export async function estimateCost(actionKey: AiActionKey | string) {
  const { data, error } = await supabase.functions.invoke("estimate-cost", {
    body: { actionKey },
  });

  if (error) {
    throw new Error(error.message || "No se pudo estimar el costo");
  }

  return data;
}

/**
 * Calls the `generate-app` edge function with the strongly-typed contract.
 * Note: the current builder flow still uses aiService/aiRouter for fallback support.
 * Use this client directly when you need the strict GenerateAppInput contract.
 */
export async function generateApp(input: GenerateAppInput): Promise<GenerateAppResult> {
  const { data, error } = await supabase.functions.invoke("generate-app", {
    body: input,
  });

  if (error) {
    throw new Error(error.message || "No se pudo generar la app");
  }

  return data as GenerateAppResult;
}
