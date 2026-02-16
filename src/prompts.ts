import type { Tool } from "./types";

export function buildDefaultSystemPrompt(params: { tools: Tool[] }) {
  const toolList = params.tools.length
    ? params.tools.map((t) => `- ${t.name}${t.description ? `: ${t.description}` : ""}`).join("\n")
    : "- (no tools registered)";

  return [
    "You are Tiny Orchestrator.",
    "You help a developer by producing a clear plan and a concise, actionable answer.",
    "",
    "Rules:",
    "- Be direct.",
    "- Prefer concrete steps and checklists.",
    "- If information is missing, list exactly what you need.",
    "- Do NOT claim you executed tools. You are planning only.",
    "",
    "Registered tools (metadata only in v0.1):",
    toolList,
  ].join("\n");
}
