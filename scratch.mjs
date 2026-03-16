import { loadPolicyConfig } from "./lib/tutor/config/loadPolicyConfig.js";
import { loadStepsConfig } from "./lib/tutor/config/loadStepsConfig.js";
import { routeStudentStep } from "./lib/tutor/routing/routeStudentStep.js";
import { llmStepMatcher } from "./lib/tutor/routing/llmStepMatcher.js";

const policyConfig = loadPolicyConfig();
const stepsConfig = loadStepsConfig();

const result = await routeStudentStep({
  studentText: "maybe remove the 5?",
  policyConfig,
  stepsConfig,
  llmStepMatcher,
});

console.log(result);
