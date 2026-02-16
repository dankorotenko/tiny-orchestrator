import { Orchestrator } from "../dist/index.js";

const llm = {
  async complete() {
    return { content: JSON.stringify({ type: "final", content: "smoke" }) };
  },
};

const orch = new Orchestrator({ llm });
const out = await orch.run({ goal: "smoke" });

if (out.summary !== "smoke") {
  throw new Error(`unexpected summary: ${out.summary}`);
}

console.log("node smoke: ok");
