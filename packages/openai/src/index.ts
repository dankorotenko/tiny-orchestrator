import type { LLM, LLMInput, LLMResponse } from "tiny-orchestrator";

export type OpenAIChatLLMOptions = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  /** Additional headers (e.g. for proxies). */
  headers?: Record<string, string>;
};

function env(key: string): string | undefined {
  return typeof process !== "undefined" ? process.env[key] : undefined;
}

export class OpenAIChatLLM implements LLM {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(opts: OpenAIChatLLMOptions = {}) {
    const apiKey = opts.apiKey ?? env("OPENAI_API_KEY");
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY (or pass apiKey)");

    this.apiKey = apiKey;
    this.model = opts.model ?? env("OPENAI_MODEL") ?? "gpt-4o-mini";
    this.baseUrl = (opts.baseUrl ?? env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.headers = opts.headers ?? {};
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
      throw new Error(`OpenAI error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as any;
    const content = json?.choices?.[0]?.message?.content ?? "";

    return { content, raw: json };
  }
}
