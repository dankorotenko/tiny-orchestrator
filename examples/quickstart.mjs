import { Orchestrator } from "tiny-orchestrator";
import { OpenRouterChatLLM } from "@tiny-orchestrator/openrouter";

// 1) Install:
//    npm i tiny-orchestrator @tiny-orchestrator/openrouter
// 2) Set env:
//    export OPENROUTER_API_KEY="..."
//    export OPENROUTER_MODEL="openai/gpt-4o-mini"

const llm = new OpenRouterChatLLM();

const tools = [
  {
    name: "now",
    description: "Return current ISO time",
    async run() {
      return new Date().toISOString();
    },
  },
  {
    name: "add",
    description: "Add two numbers",
    async run(args) {
      return Number(args.a) + Number(args.b);
    },
  },
];

const orch = new Orchestrator({
  llm,
  tools,
  budgets: { maxSteps: 8, timeMs: 30_000 },
});

const goal = process.argv.slice(2).join(" ") || "What time is it now? Then compute 19 + 23.";
const out = await orch.run({ goal });
console.log(out.summary);
