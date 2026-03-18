import { getHelpTemplate } from "./helpTemplates.js";

export function buildHelpResponse(problemState) {
  const template = getHelpTemplate(problemState);

  const lines = [
    template.strategyTitle,
    ...template.strategyLines.map((line, index) => `${index + 1}. ${line}`),
    "",
    template.workedExampleTitle,
    ...template.workedExample,
    "",
    template.prompt
  ];

  return {
    kind: "help_tutorial",
    message: lines.join("\n")
  };
}