// Shared types used by edge functions and provider adapters.
// Mirrors src/features/ai/aiTypes.ts (BuilderOutput) for backend consumers.

export interface BuilderOutput {
  projectName: string;
  description?: string;
  dependencies: string[];
  files: Record<string, string>;
  previewCode?: string;
}

export type AiProvider =
  | "openai"
  | "gemini"
  | "claude"
  | "grok"
  | "lovable"
  | "custom";

export type AiActionKey =
  | "simple_prompt"
  | "edit_prompt"
  | "medium_module"
  | "complex_module"
  | "full_app";

export interface GenerateAppRequest {
  projectId: string;
  prompt: string;
  mode?: "create" | "edit";
  actionKey?: AiActionKey;
  model?: string;
  provider?: AiProvider;
}
