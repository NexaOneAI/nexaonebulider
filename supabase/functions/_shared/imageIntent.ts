/**
 * Detects whether a user prompt asks the assistant to ADD a generated image
 * (hero, banner, foto, ilustración, etc.) to the app, and if so extracts a
 * concise English description suitable for an image-generation model.
 *
 * Strategy: a single cheap call to gemini-flash-lite that returns a tool
 * argument. If the gateway is unavailable or the model abstains, we fall back
 * to "no intent" so the regular edit pipeline runs unchanged.
 */

export interface ImageIntent {
  needs_image: boolean;
  description?: string;
  alt?: string;
  placement_hint?: string; // e.g. "hero", "card thumbnail", "background"
}

const TOOL = {
  type: "function" as const,
  function: {
    name: "classify_image_intent",
    description:
      "Decide whether the user is asking to ADD or REPLACE a real image (hero, banner, photo, illustration, avatar, thumbnail) in the app's UI. Pure UI/styling changes, icons, or color tweaks are NOT image intents.",
    parameters: {
      type: "object",
      properties: {
        needs_image: { type: "boolean" },
        description: {
          type: "string",
          description:
            "Concise English image-generation prompt (subject, style, mood, lighting, ~20 words). Empty if needs_image=false.",
        },
        alt: {
          type: "string",
          description: "Short alt text for the image in the UI language. Empty if needs_image=false.",
        },
        placement_hint: {
          type: "string",
          description:
            "Where the image should go: 'hero', 'background', 'card', 'thumbnail', 'avatar', 'inline'. Empty if needs_image=false.",
        },
      },
      required: ["needs_image"],
      additionalProperties: false,
    },
  },
};

const SYSTEM = `You classify user requests for an AI app builder.
Return needs_image=true ONLY when the user explicitly asks to ADD, GENERATE, REPLACE or INSERT a real image / photo / illustration / hero / banner / cover / avatar / background image.
Return needs_image=false for: layout changes, color/style tweaks, copy edits, icons (lucide), emoji, charts, logos described as text, or anything that is not a raster image.
When unsure, return false.`;

export async function classifyImageIntent(
  prompt: string,
  apiKey: string,
): Promise<ImageIntent> {
  // Cheap regex prefilter — bail out fast on obvious non-image prompts so we
  // don't burn a request on every edit.
  const lower = prompt.toLowerCase();
  const HINT_RE =
    /(imagen|imagenes|imágenes|foto|fotos|photo|hero|banner|cover|portada|ilustraci[oó]n|illustration|avatar|background|fondo|thumbnail|miniatura|picture)/i;
  if (!HINT_RE.test(lower)) {
    return { needs_image: false };
  }

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "classify_image_intent" } },
      }),
    });
    if (!resp.ok) return { needs_image: false };
    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return { needs_image: false };
    const parsed = JSON.parse(args) as ImageIntent;
    if (!parsed.needs_image) return { needs_image: false };
    return {
      needs_image: true,
      description: parsed.description?.trim() || prompt.slice(0, 200),
      alt: parsed.alt?.trim() || "",
      placement_hint: parsed.placement_hint?.trim() || "inline",
    };
  } catch (e) {
    console.warn("image-intent classifier failed:", e);
    return { needs_image: false };
  }
}
