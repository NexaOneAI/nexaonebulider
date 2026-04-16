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
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  { id: 'openai', name: 'OpenAI', label: 'OpenAI GPT-4', available: true },
  { id: 'claude', name: 'Claude', label: 'Claude 3.5', available: true },
  { id: 'gemini', name: 'Gemini', label: 'Gemini Pro', available: true },
  { id: 'custom', name: 'Custom', label: 'Custom Model', available: true },
];
