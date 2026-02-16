import { Orchestrator } from "tiny-orchestrator";
import { OpenAIChatLLM } from "@tiny-orchestrator/openai";

const llm = new OpenAIChatLLM();

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
