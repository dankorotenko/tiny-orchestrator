import { describe, expect, it } from "vitest";
import { Orchestrator } from "../src/orchestrator";

describe("Orchestrator", () => {
  it("returns a summary and trace", async () => {
    const llm = {
      async complete() {
        return { content: "ok" };
      },
    };

    const orch = new Orchestrator({ llm });
    const out = await orch.run({ goal: "do something" });

    expect(out.summary).toBe("ok");
    expect(out.trace[0]?.t).toBe("run.start");
    expect(out.trace.at(-1)?.t).toBe("run.end");
  });
});
