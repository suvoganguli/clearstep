import { getHelpTemplate } from "./helpTemplates.js";

export function buildHelpResponse(problemState, options = {}) {
  const style = options?.style === "light" ? "light" : "full";
  const template = getHelpTemplate(problemState);

  const lines =
    style === "light"
      ? [
          template.strategyTitle,
          `1. ${template.strategyLines[0]}`,
          "",
          template.prompt,
        ]
      : [
          template.strategyTitle,
          ...template.strategyLines.map((line, index) => `${index + 1}. ${line}`),
          "",
          template.workedExampleTitle,
          ...template.workedExample,
          "",
          template.prompt,
        ];

  return {
    kind: "help_tutorial",
    message: lines.join("\n")
  };
}