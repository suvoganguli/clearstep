import { parseAxPlusBEqualsC } from "../lib/algebra/linear/v1/parser.js";
import { createProblemState } from "../lib/tutor-core/session/problemState.js";
import { processStudentTurn } from "../lib/tutor-core/processStudentTurn.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    process.exitCode = 1;
  }
}

const EXPECTED_MSG =
  "I can handle decimals and simple fractions like 1/3, but not mixed fractions like 1 1/2 yet. Please rewrite it as an improper fraction (for example, 3/2) or a decimal.";

runTest("mixed fraction in problem is rejected with clear message", async () => {
  let thrown = null;
  try {
    parseAxPlusBEqualsC("1 1/2x + 3 = 7");
  } catch (err) {
    thrown = err;
  }

  assert(thrown, "Expected parser to throw for mixed fraction");
  assert(thrown.code === "OUT_OF_SCOPE_FRACTION", "Expected OUT_OF_SCOPE_FRACTION code");
  assert(thrown.message === EXPECTED_MSG, "Expected clear learner-facing message");
});

runTest("mixed fraction in student step returns clear tutor message", async () => {
  const problemState = createProblemState("3x + 5 = 20");
  const result = await processStudentTurn({
    problemState,
    studentText: "subtract 1 1/2",
  });

  assert(
    result.routeResult.route === "recovery_prompt",
    `Expected recovery_prompt, got ${result.routeResult.route}`,
  );
  assert(result.reply?.tutorText === EXPECTED_MSG, "Expected clear tutor message");
});

runTest("malformed fraction input returns clear tutor message", async () => {
  const problemState = createProblemState("3x + 5 = 20");
  const result = await processStudentTurn({
    problemState,
    studentText: "subtract /2",
  });

  assert(
    result.routeResult.route === "recovery_prompt",
    `Expected recovery_prompt, got ${result.routeResult.route}`,
  );
  assert(result.reply?.tutorText === EXPECTED_MSG, "Expected clear tutor message");
});
