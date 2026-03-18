function inferEquationFamily(problemState) {
  const version = problemState?.algebra?.version;

  if (version === "ax_plus_b_eq_cx_plus_d") {
    return "ax_plus_b_eq_cx_plus_d";
  }

  return "ax_plus_b_eq_c";
}

export function getHelpTemplate(problemState) {
  const equationFamily = inferEquationFamily(problemState);

  if (equationFamily === "ax_plus_b_eq_cx_plus_d") {
    return {
      equationFamily,
      strategyTitle: "For equations like ax + b = cx + d, the usual idea is:",
      strategyLines: [
        "Move all x-terms to one side.",
        "Move constants to the other side.",
        "Then divide by the remaining coefficient."
      ],
      workedExampleTitle: "Example:",
      workedExample: [
        "3x + 5 = x + 11",
        "subtract x from both sides -> 2x + 5 = 11",
        "subtract 5 from both sides -> 2x = 6",
        "divide by 2 -> x = 3"
      ],
      prompt: "For your problem, type the next step in words to remove the x-term on the right side (for example: subtract x)"
    };
  }

  return {
    equationFamily: "ax_plus_b_eq_c",
    strategyTitle: "For equations like ax + b = c, the usual idea is:",
    strategyLines: [
      "Get the constant away from the x-term.",
      "Then divide by the coefficient of x."
    ],
    workedExampleTitle: "Example:",
    workedExample: [
      "3x + 5 = 20",
      "subtract 5 from both sides -> 3x = 15",
      "divide by 3 -> x = 5"
    ],
    prompt: "For your problem, ype the next step in words to remove the constant term on the left side (for example: subtract 5)"
  };
}