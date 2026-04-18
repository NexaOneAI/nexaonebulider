import type { AIProviderAdapter } from './types';
import type { AIStructuredResponse } from '../aiTypes';

/**
 * Claude (Anthropic) provider — placeholder.
 * Currently routes through Lovable Gateway in aiRouter.
 * Enable + implement when an ANTHROPIC_API_KEY is configured.
 */
class ClaudeProvider implements AIProviderAdapter {
  readonly name = 'Claude (Anthropic)';

  async generate(_prompt: string): Promise<AIStructuredResponse> {
    throw new Error('Claude provider no está habilitado. Usa Lovable Gateway o configura ANTHROPIC_API_KEY.');
  }

  async edit(_prompt: string, _currentFiles: string): Promise<AIStructuredResponse> {
    throw new Error('Claude provider no está habilitado. Usa Lovable Gateway o configura ANTHROPIC_API_KEY.');
  }
}

export const claudeProvider = new ClaudeProvider();
