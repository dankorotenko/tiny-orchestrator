import type { LLM, LLMInput, LLMResponse } from "tiny-orchestrator";

export type OpenRouterChatLLMOptions = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  /** Recommended by OpenRouter for rankings/analytics. */
  siteUrl?: string;
  appName?: string;
  /** Additional headers (advanced). */
  headers?: Record<string, string>;
};

function env(key: string): string | undefined {
  return typeof process !== "undefined" ? process.env[key] : undefined;
}

export class OpenRouterChatLLM implements LLM {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(opts: OpenRouterChatLLMOptions = {}) {
    const apiKey = opts.apiKey ?? env("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY (or pass apiKey)");

    this.apiKey = apiKey;
    this.model = opts.model ?? env("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini";
    this.baseUrl = (opts.baseUrl ?? env("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");

    const siteUrl = opts.siteUrl ?? env("OPENROUTER_SITE_URL");
    const appName = opts.appName ?? env("OPENROUTER_APP_NAME");

    this.headers = {
      ...(siteUrl ? { "HTTP-Referer": siteUrl } : {}),
      ...(appName ? { "X-Title": appName } : {}),
      ...(opts.headers ?? {}),
    };
  }

  async complete(input: LLMInput): Promise<LLMResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...this.headers,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(input.system ? [{ role: "system", content: input.system }] : []),
          ...input.messages,
        ],
        temperature: 0.2,
      }),
      signal: input.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenRouter error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as any;
    const content = json?.choices?.[0]?.message?.content ?? "";

    return { content, raw: json };
  }
}
