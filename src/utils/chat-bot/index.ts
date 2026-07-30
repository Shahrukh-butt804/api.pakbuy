// OpenRouter is OpenAI-compatible, so no SDK is needed — plain fetch works.
// Free models are rate-limited (roughly 20 req/min, 200 req/day per key as of
// mid-2026 — check https://openrouter.ai/docs for current limits), so this
// throws a typed error on 429 that the controller turns into a friendly
// "assistant is busy" message instead of a raw 500.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class OpenRouterRateLimitError extends Error {
  constructor() {
    super("OpenRouter rate limit reached");
    this.name = "OpenRouterRateLimitError";
  }
}

export async function callOpenRouter(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in the environment");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // Optional but recommended by OpenRouter for attribution/analytics
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:5173",
      "X-Title": process.env.SITE_NAME || "Store Assistant",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
      messages,
      temperature: 0.4,
      max_tokens: 500,
    }),
  });

  if (response.status === 429) {
    throw new OpenRouterRateLimitError();
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error("OpenRouter returned no reply content");
  }

  return reply;
}