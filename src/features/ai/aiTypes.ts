// AI feature types
export interface AIMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string;
  created_at: string;
}

export interface AIStructuredResponse {
  projectName: string;
  description: string;
  files: import('../projects/projectTypes').GeneratedFile[];
  dependencies: Record<string, string>;
  pages: string[];
  components: string[];
}

export interface AIProviderConfig {
  id: string;
  name: string;
  label: string;
  available: boolean;
  provider: 'openai' | 'google';
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  { id: 'openai/gpt-5', name: 'GPT-5', label: 'OpenAI GPT-5', available: true, provider: 'openai' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', label: 'OpenAI GPT-5 Mini', available: true, provider: 'openai' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini Pro', label: 'Gemini 2.5 Pro', available: true, provider: 'google' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini Flash', label: 'Gemini 3 Flash', available: true, provider: 'google' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini Lite', label: 'Gemini 2.5 Lite', available: true, provider: 'google' },
];
