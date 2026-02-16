# tiny-orchestrator

[![npm](https://img.shields.io/npm/v/tiny-orchestrator)](https://www.npmjs.com/package/tiny-orchestrator)
[![npm](https://img.shields.io/npm/v/@tiny-orchestrator/openrouter)](https://www.npmjs.com/package/@tiny-orchestrator/openrouter)
[![license](https://img.shields.io/npm/l/tiny-orchestrator)](./packages/tiny-orchestrator/LICENSE)

Minimal LLM orchestrator: **JSON tool protocol + execution loop + traces**.

You write tools in code, plug in an LLM provider, and the orchestrator runs a step loop until it returns a final answer.

## Quickstart (recommended: OpenRouter)

```bash
npm i tiny-orchestrator @tiny-orchestrator/openrouter

export OPENROUTER_API_KEY="..."
export OPENROUTER_MODEL="openai/gpt-4o-mini"

node examples/quickstart.mjs
```

## Advanced example (multi-step + trace)

```bash
node examples/advanced.mjs
```

## Install

### Core + OpenRouter (recommended)

```bash
npm i tiny-orchestrator @tiny-orchestrator/openrouter
# or
bun add tiny-orchestrator @tiny-orchestrator/openrouter
```

### Core + OpenAI (direct)

```bash
npm i tiny-orchestrator @tiny-orchestrator/openai
# or
bun add tiny-orchestrator @tiny-orchestrator/openai
```

## Usage

```ts
import { Orchestrator } from "tiny-orchestrator";
import { OpenRouterChatLLM } from "@tiny-orchestrator/openrouter";

const llm = new OpenRouterChatLLM({
  // You can also just rely on env vars OPENROUTER_API_KEY / OPENROUTER_MODEL.
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

const orch = new Orchestrator({
  llm,
  tools,
  budgets: { maxSteps: 10, timeMs: 30_000 },
});

const out = await orch.run({ goal: "Use the add tool to compute 2 + 2, then explain." });
console.log(out.summary);
```

## Tool calling protocol

The orchestrator expects the model to output **one JSON object** per step:

- Tool request:
  - `{ "type": "tool", "name": "add", "args": { "a": 2, "b": 2 } }`
- Final answer:
  - `{ "type": "final", "content": "..." }`

The core includes:
- loose JSON parsing (can extract the first JSON object if the model adds extra text)
- one corrective retry if the model output isn’t valid JSON

## Choosing models (OpenRouter)

OpenRouter lets users access many models via a single API.

Env vars:

```bash
export OPENROUTER_API_KEY="..."
export OPENROUTER_MODEL="openai/gpt-4o-mini"   # or e.g. anthropic/claude-3.5-sonnet, google/gemini-1.5-flash

# Optional (recommended by OpenRouter)
export OPENROUTER_SITE_URL="https://your-site.com"
export OPENROUTER_APP_NAME="tiny-orchestrator demo"
```

## Packages

- `tiny-orchestrator` — core orchestrator + types
- `@tiny-orchestrator/openrouter` — OpenRouter provider (fetch-based, OpenAI-compatible) — recommended
- `@tiny-orchestrator/openai` — OpenAI provider (fetch-based)

## Templates

```ts
import { researcher, reviewer, writer } from "tiny-orchestrator/templates";

console.log(researcher(), reviewer(), writer());
```

## Runtime

- Node.js: **18+**
- Bun: supported for running scripts/tests

## Repo dev (monorepo)

This repository uses npm workspaces. From repo root:

```bash
npm install
npm test
npm run build
npm run lint
```

## License

MIT
