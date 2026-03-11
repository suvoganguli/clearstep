function formatAx(a) {
  if (a === 1) return "x";
  if (a === -1) return "-x";
  return `${a}x`;
}

export function buildDeterministicResponse(det, intent) {
  const verdict = det?.stepVerdict;
  const solved = det?.solved;

  if (!verdict || !solved) return null;

  const axForm = `${formatAx(solved.a)} = ${solved.rhsAfterSubtract}`;

  switch (verdict.kind) {
    case "FINAL_CORRECT":
      return {
        response_type: "DONE",
        hint_level: 0,
        final_correct: true,
        content: "Correct. Want to try a new problem?",
      };

    case "FINAL_INCORRECT":
      return {
        response_type: "FEEDBACK",
        hint_level: 1,
        content: "Not quite. Check your arithmetic and solve for x carefully.",
      };

    case "STEP_CORRECT":
      if (verdict.stage === "ARITHMETIC_OK") {
        return {
          response_type: "FEEDBACK",
          hint_level: 1,
          content: `Nice. ${solved.rhsAfterSubtract} is correct. Now write the equation as ${axForm}.`,
        };
      }

      if (verdict.stage === "ISOLATED_AX") {
        return {
          response_type: "FEEDBACK",
          hint_level: 1,
          content: `Good. What operation will isolate x now?`,
        };
      }

      return {
        response_type: "FEEDBACK",
        hint_level: 1,
        content: "Good step. Keep going.",
      };

    case "STEP_INCORRECT":
      if (typeof verdict.expected === "number") {
        return {
          response_type: "HINT",
          hint_level: 2,
          content:
            "Check the result after combining the numbers on the right side.",
        };
      }

      return {
        response_type: "HINT",
        hint_level: 2,
        content: `Close, but that step is not correct. After simplifying, you should get ${axForm}.`,
      };

    case "STEP_HINT":
      if (verdict.stage === "MOVE_X_TERMS") {
        const n = solved.rightXCoeff;

        if (n === 1) {
          return {
            response_type: "FEEDBACK",
            hint_level: 1,
            content: "Yes — subtract x from both sides.",
          };
        }

        if (n === -1) {
          return {
            response_type: "FEEDBACK",
            hint_level: 1,
            content: "Yes — add x to both sides.",
          };
        }

        if (n > 0) {
          return {
            response_type: "FEEDBACK",
            hint_level: 1,
            content: `Yes — subtract ${n}x from both sides.`,
          };
        }

        return {
          response_type: "FEEDBACK",
          hint_level: 1,
          content: `Yes — add ${Math.abs(n)}x to both sides.`,
        };
      }

      if (verdict.stage === "SUBTRACT_B") {
        if (solved.b > 0) {
          return {
            response_type: "FEEDBACK",
            hint_level: 1,
            content: `Yes — subtract ${solved.b} from both sides.`,
          };
        }

        if (solved.b < 0) {
          return {
            response_type: "FEEDBACK",
            hint_level: 1,
            content: `Yes — add ${Math.abs(solved.b)} to both sides.`,
          };
        }

        return {
          response_type: "FEEDBACK",
          hint_level: 1,
          content: `Yes — there is no constant term to remove first.`,
        };
      }

      if (verdict.stage === "DIVIDE_BY_A") {
        return {
          response_type: "HINT",
          hint_level: 1,
          content: `Good. So what value does that give for x?`,
        };
      }

      if (verdict.stage === "DIVIDE_BY_WHAT") {
        return {
          response_type: "HINT",
          hint_level: 2,
          content: `Divide by the coefficient of x, which is ${solved.a}.`,
        };
      }

      return {
        response_type: "HINT",
        hint_level: 2,
        content: "Think about the operation that will isolate x.",
      };

    case "UNKNOWN":
      return {
        response_type: "QUESTION",
        hint_level: 1,
        content: "What is the next algebra step you want to take?",
      };

    default:
      return null;
  }
}
