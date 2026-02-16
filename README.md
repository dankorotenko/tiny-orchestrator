# tiny-orchestrator

A tiny TypeScript multi-agent runner with sane defaults, templates, and traces.

## Goals

- **Small surface area**: `new Orchestrator({ llm }).run({ goal })`
- **Code-driven orchestration**: budgets/policy live in code; the model is a worker.
- **Bring your own LLM**: minimal `LLM` interface (OpenAI/Anthropic/local).
- **Traces**: every run returns a trace you can persist.

## Install

```bash
# bun
bun add tiny-orchestrator

# npm
npm i tiny-orchestrator
```

## Usage

```ts
import { Orchestrator } from "tiny-orchestrator";

const llm = {
  async complete({ system, messages }) {
    // Plug in your provider here.
    return {
      content: `SYSTEM:\n${system}\n\nUSER:\n${messages.map((m) => m.content).join("\n")}`,
    };
  },
};

const orch = new Orchestrator({ llm });
const out = await orch.run({ goal: "Review PR #123 and list risks" });

console.log(out.summary);
console.log(out.trace);
```

## Templates

```ts
import { researcher, reviewer, writer } from "tiny-orchestrator/templates";

console.log(researcher(), reviewer(), writer());
```

## Runtime

This package is **Node 18+** compatible. You can run scripts with **bun** or **node**.

## License

MIT
