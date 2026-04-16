import type { AIStructuredResponse } from '../aiTypes';

/**
 * Provider adapter interface — every AI provider implements this.
 * Decoupled from any specific gateway so we can swap providers.
 */
export interface AIProviderAdapter {
  readonly name: string;
  generate(prompt: string, context?: string): Promise<AIStructuredResponse>;
  edit(prompt: string, currentFiles: string, context?: string): Promise<AIStructuredResponse>;
}

/**
 * Provider configuration for the router
 */
export interface ProviderConfig {
  id: string;
  adapter: AIProviderAdapter;
  priority: number; // lower = higher priority for fallback
  enabled: boolean;
}
