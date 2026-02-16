export type TemplateAgent = {
  name: string;
  system: string;
};

export function researcher(): TemplateAgent {
  return {
    name: "researcher",
    system: [
      "You are a research agent.",
      "Return:",
      "- bullet findings",
      "- sources (URLs) when available",
      "- uncertainties",
    ].join("\n"),
  };
}

export function reviewer(): TemplateAgent {
  return {
    name: "reviewer",
    system: [
      "You are a code reviewer.",
      "Return:",
      "- summary",
      "- risks",
      "- suggested changes",
      "- tests to add",
    ].join("\n"),
  };
}

export function writer(): TemplateAgent {
  return {
    name: "writer",
    system: [
      "You are a technical writer.",
      "Write a clean, concise draft.",
    ].join("\n"),
  };
}
