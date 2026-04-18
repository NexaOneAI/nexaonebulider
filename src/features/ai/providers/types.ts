import type { AIStructuredResponse, AiProvider } from '../aiTypes';
import type { GeneratedFile } from '../../projects/projectTypes';

export type Tier = 'simple_task' | 'simple_edit' | 'medium_module' | 'complex_module' | 'full_app';

export interface GenerateOptions {
  projectId?: string;
  userTier?: Tier;
  /** Explicit provider override; if omitted the backend infers from model prefix. */
  provider?: AiProvider;
}

/**
 * Provider adapter interface — every AI provider implements this.
 */
export interface AIProviderAdapter {
  readonly name: string;
  generate(prompt: string, model?: string, opts?: GenerateOptions): Promise<AIStructuredResponse>;
  edit(
    prompt: string,
    currentFiles: string | GeneratedFile[],
    model?: string,
    opts?: GenerateOptions,
  ): Promise<AIStructuredResponse>;
}

export interface ProviderConfig {
  id: string;
  adapter: AIProviderAdapter;
  priority: number;
  enabled: boolean;
}
