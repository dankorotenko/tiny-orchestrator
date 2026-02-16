# tiny-orchestrator

A tiny TypeScript multi-agent runner with a tools-first loop, sane defaults, and traces.

## Quickstart (OpenRouter — recommended)

```bash
npm i tiny-orchestrator @tiny-orchestrator/openrouter
export OPENROUTER_API_KEY="..."
export OPENROUTER_MODEL="openai/gpt-4o-mini"
node examples/quickstart.mjs
```

## Packages

- `tiny-orchestrator` — core orchestrator + types
- `@tiny-orchestrator/openrouter` — OpenRouter adapter (fetch-based, OpenAI-compatible) — recommended
- `@tiny-orchestrator/openai` — OpenAI adapter (fetch-based)

## What you get

- **Tools-first loop**: the model can request tool calls; your code executes them.
- **Bring your own providers**: adapters implement a minimal `LLM` interface.
- **Trace output**: every run returns a trace array you can persist.

See `packages/tiny-orchestrator/README.md` for full docs.
