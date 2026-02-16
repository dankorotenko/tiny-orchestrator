export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMInput = {
  system?: string;
  messages: LLMMessage[];
  signal?: AbortSignal;
};

export type LLMResponse = {
  content: string;
  raw?: unknown;
};

/**
 * Minimal interface: bring your own provider (OpenAI, Anthropic, local, etc.).
 */
export interface LLM {
  complete(input: LLMInput): Promise<LLMResponse>;
}
