import { llmStepMatcher } from "./lib/tutor/routing/llmStepMatcher.js";
import { loadStepsConfig } from "./lib/tutor/config/loadStepsConfig.js";

const stepsConfig = loadStepsConfig();

console.time("first");
console.log(await llmStepMatcher("get rid of the 5", stepsConfig));
console.timeEnd("first");

console.time("second");
console.log(await llmStepMatcher("get rid of the 5", stepsConfig));
console.timeEnd("second");
