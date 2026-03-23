import { canonicalizeLinearEquation } from "../lib/algebra/linear/index.js";

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

runTest("canonicalizes fraction coefficient equation: 2/3x + 5 = 11", () => {
  const out = canonicalizeLinearEquation("2/3x + 5 = 11");
  assert(out === `${2 / 3}x + 5 = 11`, `Unexpected canonical output: ${out}`);
});

runTest("canonicalizes x over denominator equation: x/2 + 3 = 7", () => {
  const out = canonicalizeLinearEquation("x/2 + 3 = 7");
  assert(out === "0.5x + 3 = 7", `Unexpected canonical output: ${out}`);
});

runTest("regression: decimal/integer equation still canonicalizes", () => {
  const out = canonicalizeLinearEquation("0.5x + 3 = 7");
  assert(out === "0.5x + 3 = 7", `Unexpected canonical output: ${out}`);
});
