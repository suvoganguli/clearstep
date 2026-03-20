import { createProblemState } from "../lib/tutor-core/session/problemState.js";
import { buildHelpResponse } from "../lib/tutor-core/help/buildHelpResponse.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    process.exitCode = 1;
  }
}

runTest("buildHelpResponse default remains full tutorial", () => {
  const problemState = createProblemState("3x + 5 = 20");
  const response = buildHelpResponse(problemState);

  assert(response.kind === "help_tutorial", `Expected help_tutorial, got ${response.kind}`);
  assert(response.message.includes("For equations like ax + b = c"), "Expected strategy title");
  assert(response.message.includes("Example:"), "Expected worked example section");
  assert(
    response.message.includes("subtract 5 from both sides -> 3x = 15"),
    "Expected worked example content"
  );
  assert(
    response.message.includes("For your problem, type the next step"),
    "Expected next-step prompt"
  );
});

runTest("buildHelpResponse light style returns shorter help_tutorial", () => {
  const problemState = createProblemState("3x + 5 = 20");
  const fullResponse = buildHelpResponse(problemState);
  const lightResponse = buildHelpResponse(problemState, { style: "light" });

  assert(lightResponse.kind === "help_tutorial", `Expected help_tutorial, got ${lightResponse.kind}`);
  assert(
    !lightResponse.message.includes("Example:"),
    "Did not expect worked example section in light style"
  );
  assert(
    lightResponse.message.includes("For your problem, type the next step"),
    "Expected next-step prompt in light style"
  );
  assert(
    lightResponse.message.length < fullResponse.message.length,
    "Expected light message to be shorter than full message"
  );
});
