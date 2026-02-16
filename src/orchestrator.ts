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
      maxToolCalls: opts.budgets?.maxToolCalls ?? 20,
      maxSpawns: opts.budgets?.maxSpawns ?? 4,
    };
  }

  async run(input: RunInput): Promise<RunResult> {
    const runId = `to_${crypto.randomUUID()}`;
    const trace: TraceEvent[] = [];
    const tracePush = (event: TraceEvent) => trace.push(event);

    const abort = new AbortController();
    const startedAt = Date.now();
    const timer = setTimeout(() => abort.abort(new Error("time budget exceeded")), this.budgets.timeMs);

    const ctx: ToolContext = {
      runId,
      signal: abort.signal,
      trace: tracePush,
    };

    tracePush({ t: "run.start", runId, goal: input.goal, at: Date.now() });

    // Minimal v0.1: single-shot coordinator. It produces a plan + summary.
    // (We’ll add deterministic task queue + spawns in the next iteration.)
    const system = buildDefaultSystemPrompt({ tools: this.tools });

    const messages: LLMMessage[] = [
      {
        role: "user",
        content: JSON.stringify(
          {
            goal: input.goal,
            context: input.context ?? {},
            tools: this.tools.map((t) => ({ name: t.name, description: t.description ?? "" })),
          },
          null,
          2,
        ),
      },
    ];

    // For now, the orchestrator does NOT allow tool execution via model output.
    // That’s intentional: code-driven orchestration first.
    const out = await this.llm.complete({ system, messages, signal: abort.signal });

    clearTimeout(timer);

    const summary = out.content.trim();
    tracePush({ t: "run.end", runId, at: Date.now(), summary });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void ctx;
    // Return the trace so callers can persist it.
    return { runId, summary, trace };
  }
}
