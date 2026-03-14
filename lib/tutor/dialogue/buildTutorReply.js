export function buildTutorReply({ routeResult, mathResult }) {
  const { route, match } = routeResult;

  if (route === "recovery_prompt") {
    return {
      tutorText:
        "I’m not sure what step you want to take. Try saying the operation, or type the new equation.",
      status: "needs_clarification",
    };
  }

  if (route === "confirm_step") {
    return {
      tutorText: `Do you mean ${formatStepConfirmation(match)}?`,
      status: "confirming",
    };
  }

  if (route === "accept_step") {
    if (mathResult?.kind === "STEP_INCORRECT") {
      return {
        tutorText: "That step does not work here. Try a different step.",
        status: "active",
      };
    }

    if (mathResult?.kind === "FINAL_CORRECT") {
      return {
        tutorText: "Correct.",
        status: "solved",
      };
    }

    if (
      mathResult?.kind === "STEP_CORRECT" ||
      mathResult?.kind === "STEP_HINT"
    ) {
      if (
        match?.stepType === "subtract_constant" ||
        match?.stepType === "add_constant" ||
        match?.stepType === "move_x_term" ||
        match?.stepType === "divide_by_coefficient" ||
        match?.stepType === "multiply_by_coefficient"
      ) {
        return {
          tutorText: "Good idea. What equation do you get?",
          status: "active",
        };
      }

      if (match?.stepType === "state_intermediate_equation") {
        return {
          tutorText: "Nice. What step will you take next?",
          status: "active",
        };
      }
    }

    if (match?.stepType === "ask_for_help") {
      return {
        tutorText:
          "Try focusing on one thing you want to undo first. You can say subtract 5, divide by 3, or type the new equation.",
        status: "active",
      };
    }

    if (match?.stepType === "state_final_answer") {
      return {
        tutorText: "I’ll check that answer.",
        status: "active",
      };
    }
  }

  return {
    tutorText: "Tell me your next step.",
    status: "active",
  };
}

function formatStepConfirmation(match) {
  if (!match) return "that";

  switch (match.stepType) {
    case "subtract_constant":
      return `subtract ${match.valueRaw} from both sides`;
    case "add_constant":
      return `add ${match.valueRaw} to both sides`;
    case "divide_by_coefficient":
      return `divide both sides by ${match.valueRaw}`;
    case "multiply_by_coefficient":
      return `multiply both sides by ${match.valueRaw}`;
    case "move_x_term":
      return "move the x term to the other side";
    case "state_intermediate_equation":
      return `the equation ${match.valueRaw}`;
    case "state_final_answer":
      return `x = ${match.valueRaw}`;
    default:
      return "that";
  }
}
