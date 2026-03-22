import { deterministicStepMatcher } from "./deterministicStepMatcher.js";

export async function routeStudentStep({
  studentText,
  policyConfig,
  stepsConfig,
  llmStepMatcher = null,
}) {
  const deterministicMatch = deterministicStepMatcher(studentText);

  if (deterministicMatch) {
    return {
      route: "accept_step",
      match: deterministicMatch,
    };
  }

  if (!llmStepMatcher) {
    return {
      route: "recovery_prompt",
      match: null,
    };
  }

  const llmOutcome = await llmStepMatcher(studentText, stepsConfig);

  if (
    !llmOutcome ||
    llmOutcome.kind !== "match" ||
    !llmOutcome.match
  ) {
    return {
      route: "recovery_prompt",
      match: null,
    };
  }

  const llmMatch = llmOutcome.match;

  const high = policyConfig.llm_thresholds.high_confidence;
  const medium = policyConfig.llm_thresholds.medium_confidence;
  const confidence = llmMatch.confidence ?? 0;

  if (confidence >= high) {
    return {
      route: "accept_step",
      match: llmMatch,
    };
  }

  if (confidence >= medium) {
    return {
      route: "confirm_step",
      match: llmMatch,
    };
  }

  return {
    route: "recovery_prompt",
    match: llmMatch,
  };
}
