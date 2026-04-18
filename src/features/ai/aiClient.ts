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

/**
 * V2 client — accepts the looser GenerateAppRequest (most fields optional)
 * and normalizes the edge function response into a flat BuilderOutput shape:
 *   { projectName, description, dependencies: string[], files: Record<path,content>, previewCode }
 *
 * The edge function today returns files as an array of { path, content, language }
 * and dependencies as Record<string,string>. This helper adapts both shapes.
 */
export async function generateAppV2(input: GenerateAppRequest): Promise<BuilderOutput> {
  if (!input.projectId) throw new Error("projectId es requerido");
  if (!input.prompt?.trim()) throw new Error("prompt es requerido");

  const { data, error } = await supabase.functions.invoke("generate-app", {
    body: {
      mode: "create",
      ...input,
    },
  });

  if (error) throw new Error(error.message || "No se pudo generar la app");
  if (!data) throw new Error("Respuesta vacía del servidor");
  if (data.error) throw new Error(data.error);

  // Normalize files: array<{path,content}> → Record<path, content>
  const filesRecord: Record<string, string> = {};
  if (Array.isArray(data.files)) {
    for (const f of data.files) {
      if (f?.path && typeof f.content === "string") filesRecord[f.path] = f.content;
    }
  } else if (data.files && typeof data.files === "object") {
    Object.assign(filesRecord, data.files as Record<string, string>);
  }

  // Normalize dependencies: Record → string[]  (or pass-through if already array)
  let deps: string[] = [];
  if (Array.isArray(data.dependencies)) {
    deps = data.dependencies.filter((d: unknown) => typeof d === "string");
  } else if (data.dependencies && typeof data.dependencies === "object") {
    deps = Object.entries(data.dependencies).map(([name, ver]) => `${name}@${ver}`);
  }

  return {
    projectName: data.projectName ?? "Mi proyecto",
    description: data.description,
    dependencies: deps,
    files: filesRecord,
    previewCode: data.previewCode,
  };
}
