import { parseAxPlusBEqualsC } from "../lib/algebra/linear/v1/parser.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function approxEqual(a, b, eps = 1e-12) {
  return Math.abs(a - b) <= eps;
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

runTest("parses fraction coefficient: 2/3x + 5 = 11", () => {
  const parsed = parseAxPlusBEqualsC("2/3x + 5 = 11");
  assert(approxEqual(parsed.left.xCoeff, 2 / 3), `Expected 2/3, got ${parsed.left.xCoeff}`);
  assert(approxEqual(parsed.left.constant, 5), `Expected 5, got ${parsed.left.constant}`);
  assert(approxEqual(parsed.right.xCoeff, 0), `Expected 0, got ${parsed.right.xCoeff}`);
  assert(approxEqual(parsed.right.constant, 11), `Expected 11, got ${parsed.right.constant}`);
});

runTest("parses x over denominator: x/2 + 3 = 7", () => {
  const parsed = parseAxPlusBEqualsC("x/2 + 3 = 7");
  assert(approxEqual(parsed.left.xCoeff, 0.5), `Expected 0.5, got ${parsed.left.xCoeff}`);
  assert(approxEqual(parsed.left.constant, 3), `Expected 3, got ${parsed.left.constant}`);
  assert(approxEqual(parsed.right.xCoeff, 0), `Expected 0, got ${parsed.right.xCoeff}`);
  assert(approxEqual(parsed.right.constant, 7), `Expected 7, got ${parsed.right.constant}`);
});

runTest("regression: existing decimal/integer equation still parses", () => {
  const parsed = parseAxPlusBEqualsC("3x + 5 = 20");
  assert(parsed.left.xCoeff === 3, `Expected 3, got ${parsed.left.xCoeff}`);
  assert(parsed.left.constant === 5, `Expected 5, got ${parsed.left.constant}`);
  assert(parsed.right.xCoeff === 0, `Expected 0, got ${parsed.right.xCoeff}`);
  assert(parsed.right.constant === 20, `Expected 20, got ${parsed.right.constant}`);
});
