/**
 * Client for /chat-edit-stream. Parses SSE events and surfaces them as
 * typed callbacks the builder store consumes.
 */
import { supabase } from '@/integrations/supabase/client';
import type { GeneratedFile } from '../projects/projectTypes';

export interface EditStreamBlock {
  path: string;
  action: 'modify' | 'create' | 'delete';
  language?: string;
  search: string;
  replace: string;
  index: number;
}

export interface EditStreamImage {
  url: string;
  alt: string;
  placement: string;
}

export interface EditStreamDone {
  full: string;
  summary?: string;
  applied: number;
  failed: Array<{ path: string; index: number; reason: string }>;
  bytes_saved: number;
  changed_paths: string[];
  files: GeneratedFile[];
  credits_used: number;
  credits_remaining: number;
  tier: string;
  generated_image?: EditStreamImage | null;
}

export interface EditStreamCallbacks {
  onToken?: (delta: string) => void;
  onBlock?: (block: EditStreamBlock) => void;
  onImage?: (image: EditStreamImage) => void;
  onError?: (message: string) => void;
  onDone?: (done: EditStreamDone) => void;
  signal?: AbortSignal;
}

export interface EditStreamInput {
  prompt: string;
  model: string;
  projectId?: string;
  userTier?: string;
  currentFiles: GeneratedFile[];
  /** ISO timestamp filter — server only loads ai_messages strictly after it. */
  historyAfter?: string | null;
}

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-edit-stream`;

export async function editAppStream(
  input: EditStreamInput,
  cb: EditStreamCallbacks = {},
): Promise<EditStreamDone | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('No autorizado. Inicia sesión.');

  const resp = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(input),
    signal: cb.signal,
  });

  if (!resp.ok || !resp.body) {
    const errText = await resp.text().catch(() => '');
    let parsed: any = null;
    try {
      parsed = JSON.parse(errText);
    } catch {
      /* ignore */
    }
    throw new Error(parsed?.error || `Edit stream error ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let finalDone: EditStreamDone | null = null;

  const handleEvent = (event: string, dataStr: string) => {
    if (!dataStr) return;
    let data: any;
    try {
      data = JSON.parse(dataStr);
    } catch {
      return;
    }
    switch (event) {
      case 'token':
        if (typeof data.delta === 'string') cb.onToken?.(data.delta);
        break;
      case 'block':
        cb.onBlock?.(data as EditStreamBlock);
        break;
      case 'image':
        cb.onImage?.(data as EditStreamImage);
        break;
      case 'done':
        finalDone = data as EditStreamDone;
        cb.onDone?.(finalDone);
        break;
      case 'error':
        cb.onError?.(data.message || 'Stream error');
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buf.indexOf('\n\n')) !== -1) {
      const raw = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      handleEvent(event, dataLines.join('\n'));
    }
  }

  if (buf.trim()) {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of buf.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    handleEvent(event, dataLines.join('\n'));
  }

  return finalDone;
}
