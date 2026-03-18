export function deterministicStepMatcher(studentText) {
  const text = (studentText || "").trim();
  const lower = text.toLowerCase();

  function isPureNumericValue(value) {
    return /^\s*[-+]?\d*\.?\d+\s*$/.test(value);
  }

  if (!text) {
    return null;
  }

  // 1. Help requests
  if (
    lower === "help" ||
    lower.includes("hint") ||
    lower.includes("what do i do next") ||
    lower.includes("i don't know") ||
    lower.includes("i dont know")
  ) {
    return {
      source: "deterministic",
      stepType: "ask_for_help",
      valueRaw: null,
      confidence: 1.0,
      rawText: text,
    };
  }

  // 2. Equation-like input
  if (text.includes("=")) {
    const xPattern = /x/i;
    const answerPattern = /^\s*x\s*=\s*[-+]?\d*\.?\d+\s*$/i;
    const bareEquationPattern = /[-+*/()x\d.\s]+=[-+*/()x\d.\s]+/i;

    if (answerPattern.test(text)) {
      return {
        source: "deterministic",
        stepType: "state_final_answer",
        valueRaw: text.split("=")[1].trim(),
        confidence: 1.0,
        rawText: text,
      };
    }

    if (bareEquationPattern.test(text) && xPattern.test(text)) {
      return {
        source: "deterministic",
        stepType: "state_intermediate_equation",
        valueRaw: text,
        confidence: 1.0,
        rawText: text,
      };
    }
  }

  // 3. Bare numeric final answer like "5" or "-2.5"
  if (/^\s*[-+]?\d*\.?\d+\s*$/.test(text)) {
    return {
      source: "deterministic",
      stepType: "state_final_answer",
      valueRaw: text.trim(),
      confidence: 1.0,
      rawText: text,
    };
  }

  // 4. Operation phrases with numeric values
  const operationPatterns = [
    {
      stepType: "subtract_constant",
      patterns: [
        /^subtract\s+(.+)$/i,
        /^minus\s+(.+)$/i,
        /^take away\s+(.+)$/i,
        /^subtract\s+(.+)\s+from both sides$/i,
      ],
    },
    {
      stepType: "add_constant",
      patterns: [
        /^add\s+(.+)$/i,
        /^plus\s+(.+)$/i,
        /^add\s+(.+)\s+to both sides$/i,
      ],
    },
    {
      stepType: "divide_by_coefficient",
      patterns: [
        /^divide by\s+(.+)$/i,
        /^divide everything by\s+(.+)$/i,
        /^divide both sides by\s+(.+)$/i,
        /^split by\s+(.+)$/i,
      ],
    },
    {
      stepType: "multiply_by_coefficient",
      patterns: [
        /^multiply by\s+(.+)$/i,
        /^times\s+(.+)$/i,
        /^multiply both sides by\s+(.+)$/i,
      ],
    },
  ];

  for (const group of operationPatterns) {
    for (const pattern of group.patterns) {
      const match = text.match(pattern);
      if (match) {
        const valueRaw = match[1].trim();

        if (
          (group.stepType === "subtract_constant" ||
            group.stepType === "add_constant" ||
            group.stepType === "divide_by_coefficient" ||
            group.stepType === "multiply_by_coefficient") &&
          !isPureNumericValue(valueRaw)
        ) {
          continue;
        }

        return {
          source: "deterministic",
          stepType: group.stepType,
          valueRaw,
          confidence: 1.0,
          rawText: text,
        };
      }
    }
  }

  // 5. X-term movement phrases
  const xTermPatterns = [
    /^move\s+x\s+to\s+the\s+other\s+side$/i,
    /^move\s+.+x.+$/i,
    /^bring\s+the\s+x\s+term\s+over$/i,
    /^bring\s+.+x.+$/i,
    /^subtract\s+.+x.+from both sides$/i,
  ];

  for (const pattern of xTermPatterns) {
    if (pattern.test(text)) {
      return {
        source: "deterministic",
        stepType: "move_x_term",
        valueRaw: null,
        confidence: 1.0,
        rawText: text,
      };
    }
  }

  return null;
}
