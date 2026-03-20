import { loadPolicyConfig } from "../lib/tutor-core/config/loadPolicyConfig.js";
import { loadStepsConfig } from "../lib/tutor-core/config/loadStepsConfig.js";
import { routeStudentStep } from "../lib/tutor-core/routing/routeStudentStep.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runTest(name, fn) {
  Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`PASS: ${name}`);
    })
    .catch((err) => {
      console.error(`FAIL: ${name}`);
      console.error(`  ${err.message}`);
      process.exitCode = 1;
    });
}

const policyConfig = loadPolicyConfig();
const stepsConfig = loadStepsConfig();

runTest("routes 'subtract 5' as accept_step via deterministic matcher", async () => {
  const result = await routeStudentStep({
    studentText: "subtract 5",
    policyConfig,
    stepsConfig,
    llmStepMatcher: async () => {
      throw new Error("LLM matcher should not be called for deterministic match");
    },
  });

  assert(result.route === "accept_step", `Expected accept_step, got ${result.route}`);
  assert(result.match?.source === "deterministic", `Expected deterministic source`);
  assert(result.match?.stepType === "subtract_constant", `Expected subtract_constant, got ${result.match?.stepType}`);
});

runTest("routes 'subtract x' as accept_step via deterministic matcher", async () => {
  const result = await routeStudentStep({
    studentText: "subtract x",
    policyConfig,
    stepsConfig,
    llmStepMatcher: async () => {
      throw new Error("LLM matcher should not be called for deterministic match");
    },
  });

  assert(result.route === "accept_step", `Expected accept_step, got ${result.route}`);
  assert(result.match?.source === "deterministic", `Expected deterministic source`);
  assert(result.match?.stepType === "move_x_term", `Expected move_x_term, got ${result.match?.stepType}`);
});

runTest("routes 'add 3x' as accept_step via deterministic matcher", async () => {
  const result = await routeStudentStep({
    studentText: "add 3x",
    policyConfig,
    stepsConfig,
    llmStepMatcher: async () => {
      throw new Error("LLM matcher should not be called for deterministic match");
    },
  });

  assert(result.route === "accept_step", `Expected accept_step, got ${result.route}`);
  assert(result.match?.source === "deterministic", `Expected deterministic source`);
  assert(result.match?.stepType === "move_x_term", `Expected move_x_term, got ${result.match?.stepType}`);
});

runTest("routes 'x = 5' as accept_step via deterministic matcher", async () => {
  const result = await routeStudentStep({
    studentText: "x = 5",
    policyConfig,
    stepsConfig,
    llmStepMatcher: async () => {
      throw new Error("LLM matcher should not be called for deterministic match");
    },
  });

  assert(result.route === "accept_step", `Expected accept_step, got ${result.route}`);
  assert(result.match?.stepType === "state_final_answer", `Expected state_final_answer, got ${result.match?.stepType}`);
});

runTest("routes '3x = 15' as accept_step via deterministic matcher", async () => {
  const result = await routeStudentStep({
    studentText: "3x = 15",
    policyConfig,
    stepsConfig,
    llmStepMatcher: async () => {
      throw new Error("LLM matcher should not be called for deterministic match");
    },
  });

  assert(result.route === "accept_step", `Expected accept_step, got ${result.route}`);
  assert(result.match?.stepType === "state_intermediate_equation", `Expected state_intermediate_equation, got ${result.match?.stepType}`);
});

runTest("routes tentative 'subtract?' as accept_step via ask_for_help", async () => {
  const result = await routeStudentStep({
    studentText: "subtract?",
    policyConfig,
    stepsConfig,
    llmStepMatcher: async () => {
      throw new Error("LLM matcher should not be called for deterministic match");
    },
  });

  assert(result.route === "accept_step", `Expected accept_step, got ${result.route}`);
  assert(result.match?.source === "deterministic", "Expected deterministic source");
  assert(result.match?.stepType === "ask_for_help", `Expected ask_for_help, got ${result.match?.stepType}`);
});

runTest("routes high-confidence LLM match as accept_step", async () => {
  const result = await routeStudentStep({
    studentText: "maybe remove the x term",
    policyConfig,
    stepsConfig,
    llmStepMatcher: async () => ({
      source: "llm",
      stepType: "move_x_term",
      valueRaw: "x",
      confidence: 0.95,
      rawText: "maybe remove the x term",
    }),
  });

  assert(result.route === "accept_step", `Expected accept_step, got ${result.route}`);
  assert(result.match?.source === "llm", `Expected llm source`);
});

runTest("routes medium-confidence LLM match as confirm_step", async () => {
  const result = await routeStudentStep({
    studentText: "maybe divide by 3",
    policyConfig,
    stepsConfig,
    llmStepMatcher: async () => ({
      source: "llm",
      stepType: "divide_by_coefficient",
      valueRaw: "3",
      confidence: 0.75,
      rawText: "maybe divide by 3",
    }),
  });

  assert(result.route === "confirm_step", `Expected confirm_step, got ${result.route}`);
  assert(result.match?.source === "llm", `Expected llm source`);
});

runTest("routes low-confidence LLM match as recovery_prompt", async () => {
  const result = await routeStudentStep({
    studentText: "not sure maybe something",
    policyConfig,
    stepsConfig,
    llmStepMatcher: async () => ({
      source: "llm",
      stepType: "subtract_constant",
      valueRaw: "5",
      confidence: 0.2,
      rawText: "not sure maybe something",
    }),
  });

  assert(result.route === "recovery_prompt", `Expected recovery_prompt, got ${result.route}`);
});

runTest("routes null LLM match as recovery_prompt", async () => {
  const result = await routeStudentStep({
    studentText: "gibberish",
    policyConfig,
    stepsConfig,
    llmStepMatcher: async () => null,
  });

  assert(result.route === "recovery_prompt", `Expected recovery_prompt, got ${result.route}`);
});

runTest("routes to recovery_prompt when no LLM matcher is provided and deterministic misses", async () => {
  const result = await routeStudentStep({
    studentText: "gibberish",
    policyConfig,
    stepsConfig,
    llmStepMatcher: null,
  });

  assert(result.route === "recovery_prompt", `Expected recovery_prompt, got ${result.route}`);
});