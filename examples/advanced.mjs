import { Orchestrator } from "tiny-orchestrator";
import { OpenRouterChatLLM } from "@tiny-orchestrator/openrouter";

// Install:
//   npm i tiny-orchestrator @tiny-orchestrator/openrouter
// Env:
//   export OPENROUTER_API_KEY="..."
//   export OPENROUTER_MODEL="openai/gpt-4o-mini"

const llm = new OpenRouterChatLLM();

const tools = [
  {
    name: "fetchText",
    description: "Fetch a URL and return plain text (truncated)",
    async run(args) {
      const url = String(args.url ?? "");
      const maxChars = Number(args.maxChars ?? 8000);
      if (!url.startsWith("http")) throw new Error("fetchText: invalid url");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fetchText: HTTP ${res.status}`);
      const text = await res.text();
      return text.slice(0, maxChars);
    },
  },
  {
    name: "extractFirstHeading",
    description: "Extract the first markdown heading (# ...) from a markdown string",
    async run(args) {
      const text = String(args.text ?? "");
      const m = text.match(/^#\s+(.+)$/m);
      return m ? m[1].trim() : null;
    },
  },
  {
    name: "wordCount",
    description: "Count words in a string",
    async run(args) {
      const text = String(args.text ?? "");
      const words = text.trim().split(/\s+/).filter(Boolean);
      return words.length;
    },
  },
];

const orch = new Orchestrator({
  llm,
  tools,
  budgets: { maxSteps: 12, timeMs: 45_000 },
});

// This prompt intentionally encourages a multi-step run:
// research → fetch → extract → count → summarize → final
const target =
  process.argv[2] ??
  "https://raw.githubusercontent.com/dankorotenko/tiny-orchestrator/main/README.md";

const goal = `Research the document at ${target}.
1) Call fetchText(url) to retrieve it.
2) Call extractFirstHeading(text) to get the title.
3) Call wordCount(text) to get approximate length.
4) Finish with a short summary (3 bullets) that mentions the title and word count.`;

const out = await orch.run({ goal });

console.log("\n=== FINAL ===\n");
console.log(out.summary);

console.log("\n=== TRACE (tool calls) ===\n");
for (const e of out.trace) {
  if (e.t === "tool.call") {
    console.log(`→ tool.call ${e.tool}`, e.args);
  }
  if (e.t === "tool.result") {
    console.log(`← tool.result ${e.tool} ok=${e.ok}`);
  }
}
