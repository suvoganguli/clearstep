export function buildTutorReply({ routeResult, mathResult, priorHelpContext }) {
  const { route, match } = routeResult;

    if (route === "help_question") {

      // 🔴 If the step is incorrect, do NOT give a hint
      if (mathResult.kind === "STEP_INCORRECT") {
        return {
          tutorText: `Not quite — try ${mathResult.expected}.`,
          status: "active",
        };
      }      

      // 🔴 Enforce expected step when available
      if (mathResult?.expected && match?.valueRaw) {
        const expected = mathResult.expected.toLowerCase();
        const attempt = `${match.stepType} ${match.valueRaw}`.toLowerCase();

        if (!expected.includes(match.valueRaw)) {
          return {
            tutorText: `Not yet — try ${mathResult.expected} first.`,
            status: "active",
          };
        }
      }

      if (mathResult?.kind === "STEP_INCORRECT") {
        if (mathResult.expected) {
          return {
            tutorText: `Not yet — try ${mathResult.expected} first.`,
            status: "active",
          };
        }

      return {
        tutorText:
          "Not yet — think about what you want to undo first.",
        status: "active",
      };
    }

      if (mathResult?.kind === "FINAL_CORRECT") {
        return {
          tutorText: `Yes — that’s correct.`,
          status: "solved",
        };
      }

      if (mathResult?.kind === "STEP_CORRECT" || mathResult?.kind === "STEP_HINT") {
        switch (match?.stepType) {
          case "subtract_constant":
            return {
              tutorText: `Yes — subtracting ${match?.valueRaw} from both sides is a good next step. What equation do you get?`,
              status: "active",
            };

          case "add_constant":
            return {
              tutorText: `Yes — adding ${match?.valueRaw} to both sides is a good next step. What equation do you get?`,
              status: "active",
            };

          case "divide_by_coefficient":
            return {
              tutorText: `Yes — dividing both sides by ${match?.valueRaw} is the right idea here. What equation do you get?`,
              status: "active",
            };

          case "multiply_by_coefficient":
            return {
              tutorText:
                "That would only help in certain cases. What are you trying to isolate first?",
              status: "active",
            };

          case "move_x_term":
            return {
              tutorText:
                "Yes — moving the x term is a good next step. What equation would that give you?",
              status: "active",
            };

          case "state_intermediate_equation":
            return {
              tutorText: "That equation looks right. What step would you take next?",
              status: "active",
            };

          case "state_final_answer":
            return {
              tutorText: `Yes — if you think x = ${match?.valueRaw}, type x = ${match?.valueRaw} and I’ll check it.`,
              status: "active",
            };

          default:
            return {
              tutorText:
                "You’re thinking about the equation, which is good. What do you want to undo first?",
              status: "active",
            };
        }
      }

    return {
      tutorText:
        "You’re thinking about the equation, which is good. What do you want to undo first?",
      status: "active",
    };
  }


  if (route === "recovery_prompt") {
    if (routeResult.recoveryKind === "declined_confirmation") {
      return {
        tutorText: "Okay — what step would you like to try instead?",
        status: "needs_clarification",
      };
    }

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
      if (mathResult.expected) {
        return {
          tutorText: `That is not the correct step here. Try: ${mathResult.expected}. Or type "help" to get a better understanding.`,
          status: "active",
        };
      }

      if (priorHelpContext?.active && priorHelpContext?.kind === "tutorial") {
        return {
          tutorText:
            "That is not the correct step here. You may need to subtract the correct term first, or divide by the correct term.",
          status: "active",
        };
      }

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
      if (mathResult?.kind === "FINAL_CORRECT") {
        return {
          tutorText: "Yes — that’s correct.",
          status: "solved",
        };
      }

      if (mathResult?.kind === "FINAL_INCORRECT") {
        return {
          tutorText: "Not quite. Try again.",
          status: "active",
        };
      }

      return {
        tutorText: "Tell me your answer in the form x = ...",
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
