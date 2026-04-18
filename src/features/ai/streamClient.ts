import { supabase } from '@/integrations/supabase/client';

export interface StreamCallbacks {
  onToken?: (delta: string) => void;
  onFile?: (file: { path: string; size: number }) => void;
  onError?: (message: string) => void;
  onDone?: (full: string) => void;
  signal?: AbortSignal;
}

export interface StreamGenerateInput {
  prompt: string;
  model: string;
  projectId?: string;
  userTier?: string;
  provider?: string;
}

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-app-stream`;

/**
 * POSTs to the streaming edge function and parses SSE events:
 *   event: token / file / done / error
 *
 * Returns the full assembled content once the stream ends.
 */
export async function generateAppStream(
  input: StreamGenerateInput,
  cb: StreamCallbacks = {},
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('No autorizado. Inicia sesión.');

  const resp = await fetch(STREAM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
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
    throw new Error(parsed?.error || `Stream error ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let currentEvent = 'message';

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
        if (typeof data.delta === 'string') {
          full += data.delta;
          cb.onToken?.(data.delta);
        }
        break;
      case 'file':
        cb.onFile?.(data);
        break;
      case 'done':
        if (typeof data.full === 'string') full = data.full;
        cb.onDone?.(full);
        break;
      case 'error':
        cb.onError?.(data.message || 'Stream error');
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by blank lines
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = 'message';
      let dataLines: string[] = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      currentEvent = event;
      handleEvent(currentEvent, dataLines.join('\n'));
    }
  }

  // Flush trailing event without final \n\n
  if (buffer.trim()) {
    let event = 'message';
    let dataLines: string[] = [];
    for (const line of buffer.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    handleEvent(event, dataLines.join('\n'));
  }

  return full;
}
