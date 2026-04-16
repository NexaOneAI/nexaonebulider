// AI routing is now handled server-side via the generate-app edge function.
// This file is kept for backward compatibility but the actual routing
// happens in supabase/functions/generate-app/index.ts

import { AI_MODELS } from '@/lib/constants';

export function getModelId(model: string): string {
  // If already a full model ID (e.g. "openai/gpt-5"), return as-is
  if (model.includes('/')) return model;
  // Default fallback
  return AI_MODELS.GEMINI_FLASH;
}
