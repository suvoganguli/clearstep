import { loadPolicyConfig } from "./config/loadPolicyConfig.js";
import { loadStepsConfig } from "./config/loadStepsConfig.js";
import { routeStudentStep } from "./routing/routeStudentStep.js";
import { llmStepMatcher } from "./routing/llmStepMatcher.js";
import { buildTutorReply } from "./dialogue/buildTutorReply.js";
import {
  appendHistory,
  setCurrentEquation,
  setProblemStatus,
  setAwaitingConfirmation,
  clearAwaitingConfirmation,
} from "./session/problemState.js";
import { updateProblemLog } from "./session/logManager.js";
import {
  checkNextStepFor,
  deriveNextEquationFor,
} from "../algebra/linear/index.js";

function normalizeAcceptedStepType(routeResult, mathResult) {
  const stepType = routeResult.match?.stepType ?? null;

  if (
    stepType === "state_final_answer" &&
    mathResult?.kind === "STEP_CORRECT"
  ) {
    return "state_intermediate_equation";
  }

  return stepType;
}

function isYes(text) {
  return /^(yes|y|yeah|yep|correct|right|ok|okay)$/i.test((text || "").trim());
}

function isNo(text) {
  return /^(no|n|nope|not really)$/i.test((text || "").trim());
}

function stepMatchToStudentText(match) {
  if (!match) return "";

  switch (match.stepType) {
    case "subtract_constant":
      return `subtract ${match.valueRaw}`;
    case "add_constant":
      return `add ${match.valueRaw}`;
    case "divide_by_coefficient":
      return `divide by ${match.valueRaw}`;
    case "multiply_by_coefficient":
      return `multiply by ${match.valueRaw}`;
    case "move_x_term":
      return "move x to the other side";
    case "state_intermediate_equation":
      return match.valueRaw || "";
    case "state_final_answer":
      return match.valueRaw ? `x = ${match.valueRaw}` : "";
    default:
      return match.rawText || "";
  }
}

export async function processStudentTurn({ problemState, studentText }) {
  const policyConfig = loadPolicyConfig();
  const stepsConfig = loadStepsConfig();

  let routeResult;
  let mathResult = null;
  let nextStateBase = problemState;

  // Handle pending confirmation first
  if (problemState.awaitingConfirmation && isYes(studentText)) {
    routeResult = {
      route: "accept_step",
      match: problemState.awaitingConfirmation,
    };

    const version = problemState.algebra?.version;
    const solved = problemState.algebra?.solved;

    if (version && solved) {
      mathResult = checkNextStepFor(
        version,
        stepMatchToStudentText(problemState.awaitingConfirmation),
        solved,
      );
    }

    nextStateBase = clearAwaitingConfirmation(problemState);
  } else if (problemState.awaitingConfirmation && isNo(studentText)) {
    routeResult = {
      route: "recovery_prompt",
      match: null,
    };
    nextStateBase = clearAwaitingConfirmation(problemState);
  } else {
    routeResult = await routeStudentStep({
      studentText,
      policyConfig,
      stepsConfig,
      llmStepMatcher,
    });

    if (routeResult.route === "accept_step") {
      const version = problemState.algebra?.version;
      const solved = problemState.algebra?.solved;

      if (version && solved) {
        mathResult = checkNextStepFor(version, studentText, solved);
      }
    }
  }

  const reply = buildTutorReply({
    routeResult,
    mathResult,
  });

  const acceptedByMath =
    mathResult?.kind === "STEP_HINT" ||
    mathResult?.kind === "STEP_CORRECT" ||
    mathResult?.kind === "FINAL_CORRECT";

  let nextState = appendHistory(nextStateBase, {
    studentText,
    route: routeResult.route,
    stepType: normalizeAcceptedStepType(routeResult, mathResult),
    valueRaw: routeResult.match?.valueRaw ?? null,
    accepted: acceptedByMath,
    mathResult,
  });

  if (routeResult.route === "confirm_step" && routeResult.match) {
    nextState = setAwaitingConfirmation(nextState, routeResult.match);
  }

  if (
    routeResult.route !== "confirm_step" &&
    nextState.awaitingConfirmation &&
    !problemState.awaitingConfirmation
  ) {
    nextState = clearAwaitingConfirmation(nextState);
  }

  const derivedEquation =
    routeResult.route === "accept_step" &&
    problemState.algebra?.version &&
    problemState.algebra?.solved
      ? deriveNextEquationFor(
          problemState.algebra.version,
          problemState.algebra.solved,
          mathResult,
        )
      : null;

  if (derivedEquation) {
    nextState = setCurrentEquation(nextState, derivedEquation);
  } else if (
    routeResult.route === "accept_step" &&
    routeResult.match?.stepType === "state_intermediate_equation"
  ) {
    nextState = setCurrentEquation(nextState, routeResult.match.valueRaw);
  }

  if (mathResult?.kind === "FINAL_CORRECT") {
    nextState = setProblemStatus(nextState, "solved");
  }

  updateProblemLog(nextState);

  return {
    problemState: nextState,
    routeResult,
    mathResult,
    reply,
  };
}
