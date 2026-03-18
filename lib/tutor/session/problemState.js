import { tryParseLinear, solveLinearFor } from "../../algebra/linear/index.js";

export function createProblemState(problemText) {
  const { version, parsed } = tryParseLinear(problemText);
  const solved = solveLinearFor(version, parsed);

  return {
    problemId: `problem_${Date.now()}`,
    originalEquation: problemText,
    currentEquation: problemText,
    status: "active",
    awaitingConfirmation: null,
    helpContext: null,
    history: [],

    algebra: {
      version,
      parsed,
      solved,
    },
  };
}

export function appendHistory(state, entry) {
  return {
    ...state,
    history: [...state.history, entry],
  };
}

export function setCurrentEquation(state, equationText) {
  return {
    ...state,
    currentEquation: equationText,
  };
}

export function setAwaitingConfirmation(state, confirmationData) {
  return {
    ...state,
    awaitingConfirmation: confirmationData,
  };
}

export function clearAwaitingConfirmation(state) {
  return {
    ...state,
    awaitingConfirmation: null,
  };
}

export function setProblemStatus(state, status) {
  return {
    ...state,
    status,
  };
}

export function setHelpContext(state, helpContext) {
  return {
    ...state,
    helpContext,
  };
}

export function clearHelpContext(state) {
  return {
    ...state,
    helpContext: null,
  };
}