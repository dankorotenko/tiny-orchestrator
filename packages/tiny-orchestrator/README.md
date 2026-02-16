# tiny-orchestrator

A tiny TypeScript multi-agent runner with sane defaults, templates, and traces.

## Goals

- **Small surface area**: `new Orchestrator({ llm }).run({ goal })`
- **Code-driven orchestration**: budgets/policy live in code; the model is a worker.
- **Bring your own LLM**: minimal `LLM` interface (OpenAI/Anthropic/local).
- **Traces**: every run returns a trace you can persist.

## Install (core + provider)

```bash
# npm (recommended)
npm i tiny-orchestrator @tiny-orchestrator/openrouter

# bun
bun add tiny-orchestrator @tiny-orchestrator/openrouter
```

## Usage

```ts
import { Orchestrator } from "tiny-orchestrator";
import { OpenRouterChatLLM } from "@tiny-orchestrator/openrouter";

const llm = new OpenRouterChatLLM({
  // Or just set OPENROUTER_API_KEY / OPENROUTER_MODEL in env.
  apiKey: process.env.OPENROUTER_API_KEY,
  model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
});

const tools = [
  {
    name: "add",
    description: "Add two numbers",
    async run(args: { a: number; b: number }) {
      return args.a + args.b;
    },
  },
];

const orch = new Orchestrator({ llm, tools, budgets: { maxSteps: 10, timeMs: 30_000 } });
const out = await orch.run({ goal: "Use the add tool to compute 2 + 2, then explain." });

console.log(out.summary);
```

## Tool calling protocol

The model must output **one JSON object** per step:

- Tool request:
  - `{ "type": "tool", "name": "add", "args": { "a": 2, "b": 2 } }`
- Final answer:
  - `{ "type": "final", "content": "..." }`

## Templates

```ts
import { researcher, reviewer, writer } from "tiny-orchestrator/templates";

console.log(researcher(), reviewer(), writer());
```

## Runtime

This package is **Node 18+** compatible. You can run scripts with **bun** or **node**.

## License

MIT
