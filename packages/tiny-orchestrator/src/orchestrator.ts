import crypto from "node:crypto";
import { buildDefaultSystemPrompt } from "./prompts";
import type { LLMMessage } from "./llm";
import type { OrchestratorOptions, RunInput, RunResult, Tool, ToolContext, TraceEvent } from "./types";

export class Orchestrator {
  private llm: OrchestratorOptions["llm"];
  private tools: Tool[];
  private budgets: Required<NonNullable<OrchestratorOptions["budgets"]>>;

  private async completeJSON(input: Parameters<OrchestratorOptions["llm"]["complete"]>[0]): Promise<string> {
    const out1 = await this.llm.complete(input);
    const t1 = out1.content.trim();
    if (safeParseJSONLoose(t1)) return t1;

    // One corrective retry. This is the common failure mode: the model adds prose.
    const retryMessages: LLMMessage[] = [
      ...input.messages,
      {
        role: "user",
        content:
          "Your previous response was not valid JSON. Reply again with ONLY a single JSON object that follows the protocol. No markdown. No extra text.",
      },
    ];

    const out2 = await this.llm.complete({ ...input, messages: retryMessages });
    return out2.content.trim();
  }

  constructor(opts: OrchestratorOptions) {
    this.llm = opts.llm;
    this.tools = opts.tools ?? [];
    this.budgets = {
      timeMs: opts.budgets?.timeMs ?? 60_000,
      maxSteps: opts.budgets?.maxSteps ?? 20,
      maxSpawns: opts.budgets?.maxSpawns ?? 4,
    };
  }

  async run(input: RunInput): Promise<RunResult> {
    const runId = `to_${crypto.randomUUID()}`;
    const trace: TraceEvent[] = [];
    const tracePush = (event: TraceEvent) => trace.push(event);

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(new Error("time budget exceeded")), this.budgets.timeMs);

    const ctx: ToolContext = {
      runId,
      signal: abort.signal,
      trace: tracePush,
    };

    tracePush({ t: "run.start", runId, goal: input.goal, at: Date.now() });

    const system = buildDefaultSystemPrompt({ tools: this.tools });

    const toolMap = new Map(this.tools.map((t) => [t.name, t] as const));

    const messages: LLMMessage[] = [
      {
        role: "user",
        content: JSON.stringify(
          {
            goal: input.goal,
            context: input.context ?? {},
          },
          null,
          2,
        ),
      },
    ];

    for (let step = 0; step < this.budgets.maxSteps; step++) {
      const text = await this.completeJSON({ system, messages, signal: abort.signal });

      // Always record model output in the conversation.
      messages.push({ role: "assistant", content: text });

      const parsed = safeParseJSONLoose(text);
      if (!parsed || typeof parsed !== "object") {
        clearTimeout(timer);
        tracePush({ t: "run.end", runId, at: Date.now(), summary: text });
        return { runId, summary: text, trace };
      }

      const type = (parsed as any).type;
      if (type === "final") {
        const summary = String((parsed as any).content ?? "").trim();
        clearTimeout(timer);
        tracePush({ t: "run.end", runId, at: Date.now(), summary });
        return { runId, summary, trace };
      }

      if (type !== "tool") {
        // Unknown protocol → treat as final.
        clearTimeout(timer);
        tracePush({ t: "run.end", runId, at: Date.now(), summary: text });
        return { runId, summary: text, trace };
      }

      const toolName = String((parsed as any).name ?? "");
      const args = (parsed as any).args ?? {};
      tracePush({ t: "tool.call", runId, at: Date.now(), tool: toolName, args });

      const tool = toolMap.get(toolName);
      if (!tool) {
        const error = `unknown tool: ${toolName}`;
        tracePush({ t: "tool.result", runId, at: Date.now(), tool: toolName, ok: false, error });
        messages.push({
          role: "user",
          content: JSON.stringify({ type: "tool_result", name: toolName, ok: false, error }, null, 2),
        });
        continue;
      }

      try {
        const result = await tool.run(args, ctx);
        tracePush({ t: "tool.result", runId, at: Date.now(), tool: toolName, ok: true, result });
        messages.push({
          role: "user",
          content: JSON.stringify({ type: "tool_result", name: toolName, ok: true, result }, null, 2),
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        tracePush({ t: "tool.result", runId, at: Date.now(), tool: toolName, ok: false, error });
        messages.push({
          role: "user",
          content: JSON.stringify({ type: "tool_result", name: toolName, ok: false, error }, null, 2),
        });
      }
    }

    clearTimeout(timer);
    const summary = `maxSteps exceeded (${this.budgets.maxSteps})`;
    tracePush({ t: "run.end", runId, at: Date.now(), summary });
    return { runId, summary, trace };
  }
}

function safeParseJSONLoose(text: string): unknown | null {
  // Strict first.
  try {
    return JSON.parse(text);
  } catch {
    // Fall through.
  }

  // Then try to extract the first JSON object from messy output.
  const extracted = extractFirstJSONObject(text);
  if (!extracted) return null;

  try {
    return JSON.parse(extracted);
  } catch {
    return null;
  }
}

function extractFirstJSONObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }

  return null;
}

