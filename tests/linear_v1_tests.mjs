import { normalizeEquationText } from "../lib/algebra/common/textNormalize.js";
import { tryParseLinear, solveLinearFor, checkNextStepFor } from "../lib/algebra/linear/index.js";

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
  }
}

function build(problem, studentMessage = "") {
  const normalized = normalizeEquationText(problem);
  const { version, parsed } = tryParseLinear(normalized);
  const solved = solveLinearFor(version, parsed);
  const stepVerdict = checkNextStepFor(version, studentMessage, solved);

  return {
    normalized,
    version,
    parsed,
    solved,
    stepVerdict,
  };
}

console.log("Running linear v1 tests...\n");

// ----------------------
// Parsing / normalization
// ----------------------
runTest("normalizes 3x+5=20", () => {
  const result = build("3x+5=20");
  assert(result.solved.x === 5, "Expected x = 5");
});

runTest("normalizes uppercase X", () => {
  const result = build("3X + 5 = 20");
  assert(result.solved.x === 5, "Expected x = 5");
});

runTest("supports x + 5 = 20", () => {
  const result = build("x + 5 = 20");
  assert(result.solved.x === 15, "Expected x = 15");
});

runTest("supports -x + 5 = 20", () => {
  const result = build("-x + 5 = 20");
  assert(result.solved.x === -15, "Expected x = -15");
});

runTest("supports 3x = 15", () => {
  const result = build("3x = 15");
  assert(result.solved.x === 5, "Expected x = 5");
});

// ----------------------
// Step checking
// ----------------------
runTest("accepts subtract 5 as a valid first step for 3x+5=20", () => {
  const result = build("3x + 5 = 20", "subtract 5");
  assert(result.stepVerdict.kind !== "UNKNOWN", "Step should be recognized");
});

runTest("accepts intermediate arithmetic result 15", () => {
  const result = build("3x + 5 = 20", "15");
  assert(
    result.stepVerdict.kind === "STEP_CORRECT" || result.stepVerdict.kind === "STEP1_RESULT_CORRECT",
    `Expected a correct intermediate step, got ${result.stepVerdict.kind}`
  );
});

runTest("accepts 3x=15 as correct intermediate equation", () => {
  const result = build("3x + 5 = 20", "3x=15");
  assert(
    result.stepVerdict.kind === "STEP_CORRECT",
    `Expected STEP_CORRECT, got ${result.stepVerdict.kind}`
  );
});

runTest("accepts x=5 as final answer", () => {
  const result = build("3x + 5 = 20", "x=5");
  assert(
    result.stepVerdict.kind === "FINAL_CORRECT",
    `Expected FINAL_CORRECT, got ${result.stepVerdict.kind}`
  );
});

runTest("accepts bare 5 as final answer", () => {
  const result = build("3x + 5 = 20", "5");
  assert(
    result.stepVerdict.kind === "FINAL_CORRECT",
    `Expected FINAL_CORRECT, got ${result.stepVerdict.kind}`
  );
});

runTest("accepts -x=15 for -x+5=20", () => {
  const result = build("-x + 5 = 20", "-x=15");
  assert(
    result.stepVerdict.kind === "STEP_CORRECT",
    `Expected STEP_CORRECT, got ${result.stepVerdict.kind}`
  );
});

runTest("accepts x=-15 as final answer for -x+5=20", () => {
  const result = build("-x + 5 = 20", "x=-15");
  assert(
    result.stepVerdict.kind === "FINAL_CORRECT",
    `Expected FINAL_CORRECT, got ${result.stepVerdict.kind}`
  );
});

// ----------------------
// Rejections / boundaries
// ----------------------
runTest("rejects fractional solution 2x+1=0", () => {
  let failed = false;
  try {
    build("2x + 1 = 0");
  } catch (err) {
    failed = true;
  }
  assert(failed, "Expected fractional-solution problem to fail in v1");
});
