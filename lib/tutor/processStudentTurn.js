import { loadPolicyConfig } from "./config/loadPolicyConfig.js";
import { routeStudentStep } from "./routing/routeStudentStep.js";
import { llmStepMatcher } from "./routing/llmStepMatcher.js";
import { buildTutorReply } from "./dialogue/buildTutorReply.js";
import {
  appendHistory,
  setCurrentEquation,
  setProblemStatus,
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

export async function processStudentTurn({ problemState, studentText }) {
  const policyConfig = loadPolicyConfig();

  const routeResult = await routeStudentStep({
    studentText,
    policyConfig,
    llmStepMatcher,
  });

  let mathResult = null;

  if (routeResult.route === "accept_step") {
    const version = problemState.algebra?.version;
    const solved = problemState.algebra?.solved;

    if (version && solved) {
      mathResult = checkNextStepFor(version, studentText, solved);
    }
  }

  const reply = buildTutorReply({
    routeResult,
    problemState,
    mathResult,
  });

  const acceptedByMath =
    mathResult?.kind === "STEP_HINT" ||
    mathResult?.kind === "STEP_CORRECT" ||
    mathResult?.kind === "FINAL_CORRECT";

  let nextState = appendHistory(problemState, {
    studentText,
    route: routeResult.route,
    stepType: normalizeAcceptedStepType(routeResult, mathResult),
    valueRaw: routeResult.match?.valueRaw ?? null,
    accepted: acceptedByMath,
    mathResult,
  });

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
