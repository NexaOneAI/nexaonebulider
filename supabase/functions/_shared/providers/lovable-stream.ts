/**
 * Streaming variant of the Lovable Gateway adapter.
 *
 * Returns a ReadableStream<Uint8Array> of Server-Sent Events compatible with
 * EventSource on the client. Emits these custom events on top of the raw
 * `data:` deltas:
 *
 *   event: token   data: { delta: "..." }            // raw text chunk
 *   event: file    data: { path, size }              // file detected mid-stream
 *   event: done    data: { full: "..." }             // complete content (parser-ready)
 *   event: error   data: { message }                 // upstream error
 *
 * The caller (edge function) is responsible for parsing `done.full` into the
 * final BuilderOutput and persisting credits/version.
 */

const SYSTEM_PROMPT = `
Devuelve exclusivamente JSON válido.
No uses markdown.
No uses triple backticks.

Genera una app React + Vite + TypeScript.

Formato obligatorio:
{
  "projectName": "string",
  "description": "string",
  "dependencies": ["string"],
  "files": {
    "src/App.tsx": "string",
    "src/main.tsx": "string"
  },
  "previewCode": "string"
}
`;

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Detect newly closed "path/to/file": "..." entries inside the streamed JSON
 * blob and emit event: file for each one (only once per path).
 *
 * Heuristic only — used for FileTree progressive rendering. The authoritative
 * parsing happens at end-of-stream.
 */
function detectFiles(buffer: string, alreadyEmitted: Set<string>): Array<{ path: string; size: number }> {
  const out: Array<{ path: string; size: number }> = [];
  // Match "path": "...escaped string..." — the closing quote must NOT be escaped.
  const re = /"((?:src\/|app\/|components?\/|pages?\/|lib\/|hooks?\/|styles?\/|public\/|index\.html|package\.json|vite\.config\.[tj]s|tailwind\.config\.[tj]s|tsconfig\.json|README\.md|\.env)[^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buffer)) !== null) {
    const path = m[1];
    if (alreadyEmitted.has(path)) continue;
    alreadyEmitted.add(path);
    out.push({ path, size: m[2].length });
  }
  return out;
}

export interface LovableStreamOptions {
  prompt: string;
  model: string;
  apiKey: string;
  systemPromptOverride?: string;
}

/**
 * Returns an SSE-encoded stream the edge function can pipe directly to its
 * Response body. Resolves a promise with the full assembled assistant content
 * once the upstream finishes (so the caller can parse + persist).
 */
export function createLovableStream(opts: LovableStreamOptions): {
  stream: ReadableStream<Uint8Array>;
  finalContent: Promise<{ ok: true; content: string } | { ok: false; status: number; error: string }>;
} {
  const encoder = new TextEncoder();
  let resolveFinal!: (
    v: { ok: true; content: string } | { ok: false; status: number; error: string },
  ) => void;
  const finalContent = new Promise<{ ok: true; content: string } | { ok: false; status: number; error: string }>(
    (r) => (resolveFinal = r),
  );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* controller already closed */
        }
      };
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* noop */
        }
      };

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${opts.apiKey}`,
          },
          body: JSON.stringify({
            model: opts.model || "google/gemini-3-flash-preview",
            stream: true,
            messages: [
              { role: "system", content: opts.systemPromptOverride ?? SYSTEM_PROMPT },
              { role: "user", content: opts.prompt },
            ],
          }),
        });

        if (!response.ok || !response.body) {
          const text = await response.text().catch(() => "");
          safeEnqueue(sse("error", { message: `Upstream ${response.status}: ${text.slice(0, 300)}` }));
          safeClose();
          resolveFinal({ ok: false, status: response.status, error: text || `Upstream ${response.status}` });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let assembled = "";
        const emittedFiles = new Set<string>();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, nl);
            textBuffer = textBuffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") {
              textBuffer = "";
              break;
            }
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed?.choices?.[0]?.delta?.content as string | undefined;
              if (delta) {
                assembled += delta;
                safeEnqueue(sse("token", { delta }));
                // Cheap heuristic: only re-scan when a closing quote+brace pattern
                // is present in the latest delta to keep it O(n) per file boundary.
                if (/"\s*[,}]/.test(delta)) {
                  for (const f of detectFiles(assembled, emittedFiles)) {
                    safeEnqueue(sse("file", f));
                  }
                }
              }
            } catch {
              // partial JSON across chunks → push back and wait
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Final flush of any leftovers
        for (const raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
          const payload = raw.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assembled += delta;
              safeEnqueue(sse("token", { delta }));
            }
          } catch {
            /* ignore */
          }
        }

        // Final pass over assembled to emit any remaining files
        for (const f of detectFiles(assembled, emittedFiles)) {
          safeEnqueue(sse("file", f));
        }

        safeEnqueue(sse("done", { full: assembled }));
        safeClose();
        resolveFinal({ ok: true, content: assembled });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error";
        safeEnqueue(sse("error", { message }));
        safeClose();
        resolveFinal({ ok: false, status: 500, error: message });
      }
    },
  });

  return { stream, finalContent };
}
