/**
 * Small reusable helpers for emitting SSE frames and consuming an
 * OpenAI-compatible streaming chat-completions response.
 *
 * Extracted from lovable-stream.ts so multiple streaming providers
 * (lovable-stream, lovable-edit-stream, future ones) can share the
 * same plumbing without duplicating the SSE buffering logic.
 */

export function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export interface SafeController {
  enqueue: (chunk: string) => void;
  close: () => void;
  closed: () => boolean;
}

export function makeSafeController(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder = new TextEncoder(),
): SafeController {
  let isClosed = false;
  return {
    enqueue(chunk) {
      if (isClosed) return;
      try {
        controller.enqueue(encoder.encode(chunk));
      } catch {
        /* downstream gone */
      }
    },
    close() {
      if (isClosed) return;
      isClosed = true;
      try {
        controller.close();
      } catch {
        /* noop */
      }
    },
    closed: () => isClosed,
  };
}

/**
 * Iterate over OpenAI-style streaming chat-completions response body.
 * Yields each parsed JSON delta payload (already JSON.parse'd).
 *
 * Consumer is responsible for extracting `choices[0].delta.content` (or
 * `tool_calls`) since edit streams care about a different shape than
 * generation streams.
 */
export async function* parseOpenAiChatStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line || line.startsWith(":")) continue;
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") {
          buf = "";
          return;
        }
        try {
          yield JSON.parse(payload);
        } catch {
          // partial JSON spanning a chunk boundary → push back & wait
          buf = line + "\n" + buf;
          break;
        }
      }
    }

    // Flush trailing partial line if any
    for (const raw of buf.split("\n")) {
      if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
      const payload = raw.slice(6).trim();
      if (payload === "[DONE]") continue;
      try {
        yield JSON.parse(payload);
      } catch {
        /* ignore */
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* noop */
    }
  }
}
