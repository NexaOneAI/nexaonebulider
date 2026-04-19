/**
 * Streaming adapter for the EDIT mode (chat-edit-stream).
 *
 * The model is forced to emit Aider-style SEARCH/REPLACE blocks. As tokens
 * arrive we run a small state machine that detects fully-closed blocks and
 * emits an `event: block` for each one so the client can apply them
 * progressively.
 *
 * Events emitted:
 *   event: token   data: { delta }
 *   event: block   data: { path, action, language?, search, replace, index }
 *   event: meta    data: { summary?, projectName?, description? }
 *   event: done    data: { full }
 *   event: error   data: { message }
 */

import { sse, makeSafeController, parseOpenAiChatStream } from "./_sse-utils.ts";

const SEARCH_MARK = "<<<<<<< SEARCH";
const SEP_MARK = "=======";
const REPLACE_MARK = ">>>>>>> REPLACE";

interface CurrentFile {
  path: string;
  action: "modify" | "create" | "delete";
  language?: string;
  blockIndex: number;
}

interface BlockBuf {
  search: string[];
  replace: string[];
  state: "idle" | "search" | "replace";
}

export interface LovableEditStreamOptions {
  prompt: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  filesContext: string;
  history: Array<{ role: string; content: string }>;
  /** Extra system messages (e.g. project context, generated-image URL hints). */
  extraSystem?: string[];
}

export function createLovableEditStream(opts: LovableEditStreamOptions): {
  stream: ReadableStream<Uint8Array>;
  finalContent: Promise<
    { ok: true; content: string } | { ok: false; status: number; error: string }
  >;
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
              { role: "system", content: opts.systemPrompt },
              ...((opts.extraSystem ?? []).map((c) => ({ role: "system", content: c }))),
              {
                role: "user",
                content: `Current app files:\n\n${opts.filesContext}\n\nReturn ONLY SEARCH/REPLACE blocks for what changes. No JSON, no markdown fences.`,
              },
              ...opts.history,
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
        let lineBuf = "";
        let currentFile: CurrentFile | null = null;
        let blockBuf: BlockBuf = { search: [], replace: [], state: "idle" };

        const flushBlock = () => {
          if (!currentFile || blockBuf.state === "idle") return;
          const search = blockBuf.search.join("\n");
          const replace = blockBuf.replace.join("\n");
          if (currentFile.action !== "delete" && (search || replace || currentFile.action === "create")) {
            safe.enqueue(
              sse("block", {
                path: currentFile.path,
                action: currentFile.action,
                language: currentFile.language,
                search,
                replace,
                index: currentFile.blockIndex,
              }),
            );
            currentFile.blockIndex += 1;
          }
          blockBuf = { search: [], replace: [], state: "idle" };
        };

        const consumeLine = (line: string) => {
          const trimmed = line.trim();

          if (trimmed.startsWith("### ")) {
            flushBlock();
            currentFile = {
              path: trimmed.slice(4).trim(),
              action: "modify",
              language: undefined,
              blockIndex: 0,
            };
            return;
          }
          if (!currentFile) return;

          if (trimmed.startsWith("ACTION:")) {
            const v = trimmed.slice(7).trim().toLowerCase();
            if (v === "create" || v === "delete" || v === "modify") {
              currentFile.action = v as CurrentFile["action"];
              if (v === "delete") {
                safe.enqueue(
                  sse("block", {
                    path: currentFile.path,
                    action: "delete",
                    search: "",
                    replace: "",
                    index: 0,
                  }),
                );
              }
            }
            return;
          }
          if (trimmed.startsWith("LANG:")) {
            currentFile.language = trimmed.slice(5).trim();
            return;
          }
          if (trimmed === SEARCH_MARK) {
            blockBuf = { search: [], replace: [], state: "search" };
            return;
          }
          if (trimmed === SEP_MARK && blockBuf.state === "search") {
            blockBuf.state = "replace";
            return;
          }
          if (trimmed === REPLACE_MARK && blockBuf.state === "replace") {
            flushBlock();
            return;
          }

          if (blockBuf.state === "search") blockBuf.search.push(line);
          else if (blockBuf.state === "replace") blockBuf.replace.push(line);
        };

        const consumeDelta = (delta: string) => {
          assembled += delta;
          safe.enqueue(sse("token", { delta }));
          lineBuf += delta;
          let nl: number;
          while ((nl = lineBuf.indexOf("\n")) !== -1) {
            const line = lineBuf.slice(0, nl).replace(/\r$/, "");
            lineBuf = lineBuf.slice(nl + 1);
            consumeLine(line);
          }
        };

        for await (const parsed of parseOpenAiChatStream(response.body)) {
          const delta = (parsed as any)?.choices?.[0]?.delta?.content as string | undefined;
          if (delta) consumeDelta(delta);
        }

        // Flush any trailing line + open block
        if (lineBuf.length) consumeLine(lineBuf);
        flushBlock();

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
