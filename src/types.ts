import type { LLM } from "./llm";

export type TraceEvent =
  | {
      t: "run.start";
      runId: string;
      goal: string;
      at: number;
    }
  | {
      t: "run.end";
      runId: string;
      at: number;
      summary: string;
    }
  | {
      t: "tool.call";
      runId: string;
      at: number;
      tool: string;
      args: unknown;
    }
  | {
      t: "tool.result";
      runId: string;
      at: number;
      tool: string;
      ok: boolean;
      result?: unknown;
      error?: string;
    }
  | {
      t: "agent.spawn";
      runId: string;
      at: number;
      agent: string;
      task: string;
    }
  | {
      t: "agent.result";
      runId: string;
      at: number;
      agent: string;
      output: string;
    };

export type ToolContext = {
  runId: string;
  signal: AbortSignal;
  trace: (event: TraceEvent) => void;
};

export type ToolResult<TResult = unknown> =
  | { ok: true; result: TResult }
  | { ok: false; error: string };

export type Tool<TArgs = unknown, TResult = unknown> = {
  name: string;
  description?: string;
  /** Optional schema (zod/jsonschema/typebox). Treated as metadata by core. */
  schema?: unknown;
  run: (args: TArgs, ctx: ToolContext) => Promise<TResult>;
};

export type OrchestratorOptions = {
  llm: LLM;
  tools?: Tool[];
  budgets?: {
    timeMs?: number;
    maxToolCalls?: number;
    maxSpawns?: number;
  };
};

export type RunInput = {
  goal: string;
  context?: Record<string, unknown>;
};

export type RunResult = {
  runId: string;
  summary: string;
  trace: TraceEvent[];
};
