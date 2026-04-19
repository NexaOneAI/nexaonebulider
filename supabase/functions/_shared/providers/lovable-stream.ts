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
 *
 * Refactored 2026-04-19: SSE plumbing + file detection live in
 * `_sse-utils.ts` and `_file-detector.ts`. This file keeps only the
 * Lovable Gateway-specific request shape and prompt.
 */

import { sse, makeSafeController, parseOpenAiChatStream } from "./_sse-utils.ts";
import { detectFiles, shouldRescan } from "./_file-detector.ts";

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

export interface LovableStreamOptions {
  prompt: string;
  model: string;
  apiKey: string;
  systemPromptOverride?: string;
}

export function createLovableStream(opts: LovableStreamOptions): {
  stream: ReadableStream<Uint8Array>;
  finalContent: Promise<{ ok: true; content: string } | { ok: false; status: number; error: string }>;
} {
  let resolveFinal!: (
    v: { ok: true; content: string } | { ok: false; status: number; error: string },
  ) => void;
  const finalContent = new Promise<
    { ok: true; content: string } | { ok: false; status: number; error: string }
  >((r) => (resolveFinal = r));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safe = makeSafeController(controller);

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
          safe.enqueue(sse("error", { message: `Upstream ${response.status}: ${text.slice(0, 300)}` }));
          safe.close();
          resolveFinal({ ok: false, status: response.status, error: text || `Upstream ${response.status}` });
          return;
        }

        let assembled = "";
        const emittedFiles = new Set<string>();

        for await (const parsed of parseOpenAiChatStream(response.body)) {
          const delta = (parsed as any)?.choices?.[0]?.delta?.content as string | undefined;
          if (!delta) continue;
          assembled += delta;
          safe.enqueue(sse("token", { delta }));
          if (shouldRescan(delta)) {
            for (const f of detectFiles(assembled, emittedFiles)) {
              safe.enqueue(sse("file", f));
            }
          }
        }

        // Final pass to emit any files we missed
        for (const f of detectFiles(assembled, emittedFiles)) {
          safe.enqueue(sse("file", f));
        }

        safe.enqueue(sse("done", { full: assembled }));
        safe.close();
        resolveFinal({ ok: true, content: assembled });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error";
        safe.enqueue(sse("error", { message }));
        safe.close();
        resolveFinal({ ok: false, status: 500, error: message });
      }
    },
  });

  return { stream, finalContent };
}
