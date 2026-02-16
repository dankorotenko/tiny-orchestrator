import crypto from "node:crypto";
import { buildDefaultSystemPrompt } from "./prompts";
import type { LLMMessage } from "./llm";
import type { OrchestratorOptions, RunInput, RunResult, Tool, ToolContext, TraceEvent } from "./types";

export class Orchestrator {
  private llm: OrchestratorOptions["llm"];
  private tools: Tool[];
  private budgets: Required<NonNullable<OrchestratorOptions["budgets"]>>;

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
      const out = await this.llm.complete({ system, messages, signal: abort.signal });
      const text = out.content.trim();

      // Always record model output in the conversation.
      messages.push({ role: "assistant", content: text });

      const parsed = safeParseJSON(text);
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

function safeParseJSON(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

