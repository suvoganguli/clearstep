import { normalizeEquationText } from "../lib/algebra/common/textNormalize.js";
import { tryParseLinear, solveLinearFor, checkNextStepFor } from "../lib/algebra/linear/index.js";
import { canonicalizeLinearEquation } from "../lib/algebra/linear/index.js";
import { checkNextStep } from "../lib/algebra/linear/v1/engine.js";

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
  const canonical = canonicalizeLinearEquation(normalized);

  const { version, parsed } = tryParseLinear(canonical);
  const solved = solveLinearFor(version, parsed);
  const stepVerdict = checkNextStepFor(version, studentMessage, solved);

  return {
    normalized,
    canonical,
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
// Decimal coefficients (parser / solve / step checking)
// ----------------------
runTest("parses and solves 0.5x + 3 = 7", () => {
  const result = build("0.5x + 3 = 7");
  assert(result.solved.x === 8, `Expected x = 8, got ${result.solved.x}`);
});

runTest("parses and solves 2x + 1 = 2 (non-integer x)", () => {
  const result = build("2x + 1 = 2");
  assert(result.solved.x === 0.5, `Expected x = 0.5, got ${result.solved.x}`);
});

runTest("parses leading-dot coefficient .25x = 1", () => {
  const result = build(".25x = 1");
  assert(result.solved.x === 4, `Expected x = 4, got ${result.solved.x}`);
});

runTest("integer equation still parses as integers", () => {
  const result = build("3x+5=20");
  assert(Number.isInteger(result.parsed.left.xCoeff), "left xCoeff should be integer");
  assert(Number.isInteger(result.solved.x), "x should still be integer for integer problem");
});

// Stateless step checks against the same original equation (session not simulated).
runTest("decimal steps 0.5x+3=7: subtract 3", () => {
  const r = build("0.5x + 3 = 7", "subtract 3");
  assert(
    r.stepVerdict.kind === "STEP_HINT" && r.stepVerdict.stage === "SUBTRACT_B",
    `Expected SUBTRACT_B hint, got ${JSON.stringify(r.stepVerdict)}`,
  );
});

runTest("decimal steps 0.5x+3=7: bare 4 (rhs after subtract)", () => {
  const r = build("0.5x + 3 = 7", "4");
  assert(
    r.stepVerdict.kind === "STEP_CORRECT" && r.stepVerdict.stage === "ARITHMETIC_OK",
    `Expected ARITHMETIC_OK, got ${JSON.stringify(r.stepVerdict)}`,
  );
});

runTest("decimal steps 0.5x+3=7: 0.5x=4 (constant subtracted)", () => {
  const r = build("0.5x + 3 = 7", "0.5x=4");
  assert(
    r.stepVerdict.kind === "STEP_CORRECT" &&
      r.stepVerdict.stage === "SUBTRACT_CONSTANT_COMPLETE",
    `Expected SUBTRACT_CONSTANT_COMPLETE, got ${JSON.stringify(r.stepVerdict)}`,
  );
});

runTest("decimal steps 0.5x+3=7: divide before clearing constant is rejected", () => {
  const r = build("0.5x + 3 = 7", "divide by 0.5");
  assert(
    r.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${JSON.stringify(r.stepVerdict)}`,
  );
});

runTest("decimal steps 0.5x=4: divide by 0.5", () => {
  const r = build("0.5x = 4", "divide by 0.5");
  assert(
    r.stepVerdict.kind === "STEP_HINT" && r.stepVerdict.stage === "DIVIDE_BY_A",
    `Expected DIVIDE_BY_A hint, got ${JSON.stringify(r.stepVerdict)}`,
  );
});

runTest("decimal steps 0.5x+3=7: x=8 final", () => {
  const r = build("0.5x + 3 = 7", "x=8");
  assert(r.stepVerdict.kind === "FINAL_CORRECT", `Expected FINAL_CORRECT, got ${r.stepVerdict.kind}`);
});

runTest("decimal steps 2x+1=2: subtract 1", () => {
  const r = build("2x + 1 = 2", "subtract 1");
  assert(
    r.stepVerdict.kind === "STEP_HINT" && r.stepVerdict.stage === "SUBTRACT_B",
    `Expected SUBTRACT_B hint, got ${JSON.stringify(r.stepVerdict)}`,
  );
});

runTest("decimal steps 2x+1=2: bare 1", () => {
  const r = build("2x + 1 = 2", "1");
  assert(
    r.stepVerdict.kind === "STEP_CORRECT" && r.stepVerdict.stage === "ARITHMETIC_OK",
    `Expected ARITHMETIC_OK, got ${JSON.stringify(r.stepVerdict)}`,
  );
});

runTest("decimal steps 2x+1=2: 2x=1 (constant subtracted)", () => {
  const r = build("2x + 1 = 2", "2x=1");
  assert(
    r.stepVerdict.kind === "STEP_CORRECT" &&
      r.stepVerdict.stage === "SUBTRACT_CONSTANT_COMPLETE",
    `Expected SUBTRACT_CONSTANT_COMPLETE, got ${JSON.stringify(r.stepVerdict)}`,
  );
});

runTest("decimal ISOLATED_AX via is-prefixed ax=r (skips canonical equation branch)", () => {
  const r = build("0.5x = 4", "is 0.5x = 4");
  assert(
    r.stepVerdict.kind === "STEP_CORRECT" && r.stepVerdict.stage === "ISOLATED_AX",
    `Expected ISOLATED_AX, got ${JSON.stringify(r.stepVerdict)}`,
  );
});

runTest("decimal steps 2x=1: divide by 2", () => {
  const r = build("2x = 1", "divide by 2");
  assert(
    r.stepVerdict.kind === "STEP_HINT" && r.stepVerdict.stage === "DIVIDE_BY_A",
    `Expected DIVIDE_BY_A hint, got ${JSON.stringify(r.stepVerdict)}`,
  );
});

runTest("decimal steps 2x+1=2: x=0.5 final", () => {
  const r = build("2x + 1 = 2", "x=0.5");
  assert(r.stepVerdict.kind === "FINAL_CORRECT", `Expected FINAL_CORRECT, got ${r.stepVerdict.kind}`);
});

runTest("accepts x=0.33 as final for 3x=1 (within ±0.01 of 1/3)", () => {
  const r = build("3x = 1", "x=0.33");
  assert(
    r.stepVerdict.kind === "FINAL_CORRECT",
    `Expected FINAL_CORRECT, got ${r.stepVerdict.kind}`,
  );
});

runTest("rejects x=0.3 as final for 3x=1 (error > 0.01 from 1/3)", () => {
  const r = build("3x = 1", "x=0.3");
  assert(
    r.stepVerdict.kind === "FINAL_INCORRECT",
    `Expected FINAL_INCORRECT, got ${r.stepVerdict.kind}`,
  );
});

runTest("accepts bare 0.33 as final for 3x=1", () => {
  const r = build("3x = 1", "0.33");
  assert(
    r.stepVerdict.kind === "FINAL_CORRECT",
    `Expected FINAL_CORRECT, got ${r.stepVerdict.kind}`,
  );
});

runTest("wrong subtract on 3x+1=2 hints subtract 1 (not subtract 0)", () => {
  const r = build("3x + 1 = 2", "subtract 0");
  assert(
    r.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${r.stepVerdict.kind}`,
  );
  assert(
    r.stepVerdict.expected === "subtract 1",
    `Expected subtract 1, got ${r.stepVerdict.expected}`,
  );
});

runTest("expected string snaps near-integer leftConstant noise to 1", () => {
  const { solved } = build("3x + 1 = 2");
  const noisy = { ...solved, leftConstant: 0.9999999999998 };
  const v = checkNextStep("subtract 2", noisy);
  assert(
    v.expected === "subtract 1",
    `Expected subtract 1, got ${v.expected}`,
  );
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
runTest("solves 2x + 1 = 0 to non-integer x", () => {
  const result = build("2x + 1 = 0");
  assert(result.solved.x === -0.5, `Expected x = -0.5, got ${result.solved.x}`);
});


// ----------------------
// Canonicalization
// ----------------------
runTest("canonicalizes 3x + 5 = 20 unchanged", () => {
  const result = canonicalizeLinearEquation("3x + 5 = 20");
  assert(result === "3x + 5 = 20", `Expected canonical form unchanged, got ${result}`);
});

runTest("canonicalizes 5 + 3x = 20", () => {
  const result = canonicalizeLinearEquation("5 + 3x = 20");
  assert(result === "3x + 5 = 20", `Expected 3x + 5 = 20, got ${result}`);
});

runTest("canonicalizes flipped equation 20 = 3x + 5", () => {
  const result = canonicalizeLinearEquation("20 = 3x + 5");
  assert(result === "20 = 3x + 5", `Expected 20 = 3x + 5, got ${result}`);
});

runTest("canonicalizes flipped constant-first equation 20 = 5 + 3x", () => {
  const result = canonicalizeLinearEquation("20 = 5 + 3x");
  assert(result === "20 = 3x + 5", `Expected 20 = 3x + 5, got ${result}`);
});

runTest("canonicalizes 0.5x + 3 = 7", () => {
  const result = canonicalizeLinearEquation("0.5x + 3 = 7");
  assert(result === "0.5x + 3 = 7", `Expected stable decimal canonical form, got ${result}`);
});

// ----------------------
// x on both sides
// ----------------------
runTest("supports 3x + 5 = x + 9", () => {
  const result = build("3x + 5 = x + 9");
  assert(result.solved.x === 2, `Expected x = 2, got ${result.solved.x}`);
});

runTest("accepts subtract x for 3x + 5 = x + 9", () => {
  const result = build("3x + 5 = x + 9", "subtract x");
  assert(result.stepVerdict.kind !== "UNKNOWN", "Step should be recognized");
});

runTest("accepts 2x=4 as correct intermediate equation", () => {
  const result = build("3x + 5 = x + 9", "2x=4");
  assert(
    result.stepVerdict.kind === "STEP_CORRECT",
    `Expected STEP_CORRECT, got ${result.stepVerdict.kind}`
  );
});

runTest("accepts x=2 as final answer for 3x + 5 = x + 9", () => {
  const result = build("3x + 5 = x + 9", "x=2");
  assert(
    result.stepVerdict.kind === "FINAL_CORRECT",
    `Expected FINAL_CORRECT, got ${result.stepVerdict.kind}`
  );
});

runTest("supports 5 + 2x = x + 11", () => {
  const result = build("5 + 2x = x + 11");
  assert(result.solved.x === 6, `Expected x = 6, got ${result.solved.x}`);
});

runTest("accepts subtract x for 5 + 2x = x + 11", () => {
  const result = build("5 + 2x = x + 11", "subtract x");
  assert(result.stepVerdict.kind !== "UNKNOWN", "Step should be recognized");
});

runTest("accepts x=6 as final answer for 5 + 2x = x + 11", () => {
  const result = build("5 + 2x = x + 11", "x=6");
  assert(
    result.stepVerdict.kind === "FINAL_CORRECT",
    `Expected FINAL_CORRECT, got ${result.stepVerdict.kind}`
  );
});

// ----------------------
// Negative step validation
// ----------------------
runTest("rejects subtract 2x for 3x + 5 = x + 9", () => {
  const result = build("3x + 5 = x + 9", "subtract 2x");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.expected === "subtract x",
    `Expected 'subtract x', got ${result.stepVerdict.expected}`
  );
});

runTest("rejects subtract 5x for 3x + 5 = x + 9", () => {
  const result = build("3x + 5 = x + 9", "subtract 5x");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.expected === "subtract x",
    `Expected 'subtract x', got ${result.stepVerdict.expected}`
  );
});

runTest("rejects add 2x for 3x + 5 = x + 9", () => {
  const result = build("3x + 5 = x + 9", "add 2x");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.expected === "subtract x",
    `Expected 'subtract x', got ${result.stepVerdict.expected}`
  );
});

runTest("rejects subtract 5x for 4x + 5 = 20 + x", () => {
  const result = build("4x + 5 = 20 + x", "subtract 5x");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.expected === "subtract x",
    `Expected 'subtract x', got ${result.stepVerdict.expected}`
  );
});

runTest("accepts subtract x for 4x + 5 = 20 + x", () => {
  const result = build("4x + 5 = 20 + x", "subtract x");
  assert(
    result.stepVerdict.kind === "STEP_HINT",
    `Expected STEP_HINT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.stage === "MOVE_X_TERMS",
    `Expected MOVE_X_TERMS, got ${result.stepVerdict.stage}`
  );
});

runTest("rejects subtract 3x for 5 + 2x = x + 11", () => {
  const result = build("5 + 2x = x + 11", "subtract 3x");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.expected === "subtract x",
    `Expected 'subtract x', got ${result.stepVerdict.expected}`
  );
});

runTest("rejects subtract 4 for 3x + 5 = 20", () => {
  const result = build("3x + 5 = 20", "subtract 4");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.expected === "subtract 5",
    `Expected 'subtract 5', got ${result.stepVerdict.expected}`
  );
});

runTest("rejects divide by 3 directly from 3x + 5 = 20", () => {
  const result = build("3x + 5 = 20", "divide by 3");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.expected === "subtract 5",
    `Expected 'subtract 5', got ${result.stepVerdict.expected}`
  );
});

runTest("rejects wrong divide choice for 3x = 15", () => {
  const result = build("3x = 15", "divide by 5");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.expected === "divide by 3",
    `Expected 'divide by 3', got ${result.stepVerdict.expected}`
  );
});

runTest("accepts divide by 3 after reaching 3x = 15", () => {
  const result = build("3x = 15", "divide by 3");
  assert(
    result.stepVerdict.kind === "STEP_HINT",
    `Expected STEP_HINT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.stage === "DIVIDE_BY_A",
    `Expected DIVIDE_BY_A, got ${result.stepVerdict.stage}`
  );
});

runTest("rejects wrong intermediate equation 3x=14 for 3x + 5 = 20", () => {
  const result = build("3x + 5 = 20", "3x=14");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
});

runTest("rejects wrong intermediate equation 2x=5 for 3x + 5 = x + 9", () => {
  const result = build("3x + 5 = x + 9", "2x=5");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
});

runTest("rejects wrong bare number 4 for 3x + 5 = 20", () => {
  const result = build("3x + 5 = 20", "4");
  assert(
    result.stepVerdict.kind !== "FINAL_CORRECT",
    `Did not expect FINAL_CORRECT for wrong bare number`
  );
});

runTest("supports 20 + x = 4x + 5", () => {
  const result = build("20 + x = 4x + 5");
  assert(result.solved.x === 5, `Expected x = 5, got ${result.solved.x}`);
});

runTest("supports 9 + x = 5 + 3x", () => {
  const result = build("9 + x = 5 + 3x");
  assert(result.solved.x === 2, `Expected x = 2, got ${result.solved.x}`);
});

runTest("rejects add x for 4x + 5 = 20 + x", () => {
  const result = build("4x + 5 = 20 + x", "add x");
  assert(
    result.stepVerdict.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.expected === "subtract x",
    `Expected 'subtract x', got ${result.stepVerdict.expected}`
  );
});

runTest("accepts divide by three as valid step for 3x = 15", () => {
  const result = build("3x = 15", "divide by three");
  assert(
    result.stepVerdict.kind === "STEP_HINT",
    `Expected STEP_HINT, got ${result.stepVerdict.kind}`
  );
  assert(
    result.stepVerdict.stage === "DIVIDE_BY_A",
    `Expected DIVIDE_BY_A, got ${result.stepVerdict.stage}`
  );
});

