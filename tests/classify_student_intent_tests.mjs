import { classifyStudentIntent } from "../lib/tutor/classifyStudentIntent.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

console.log("Running classifyStudentIntent tests...\n");

runTest("classifies subtract 5 as direct_step", () => {
  const result = classifyStudentIntent("subtract 5");
  assert(result.kind === "direct_step", `Expected direct_step, got ${result.kind}`);
  assert(result.extractedStep === "subtract 5", `Expected subtract 5, got ${result.extractedStep}`);
});

runTest("classifies minus 5 as direct_step and normalizes it", () => {
  const result = classifyStudentIntent("minus 5");
  assert(result.kind === "direct_step", `Expected direct_step, got ${result.kind}`);
  assert(result.extractedStep === "subtract 5", `Expected subtract 5, got ${result.extractedStep}`);
});

runTest("classifies -5 as direct_step", () => {
  const result = classifyStudentIntent("-5");
  assert(result.kind === "direct_step", `Expected direct_step, got ${result.kind}`);
  assert(result.extractedStep === "-5", `Expected -5, got ${result.extractedStep}`);
});

runTest("classifies maybe we need to subtract 5 as tentative_step", () => {
  const result = classifyStudentIntent("maybe we need to subtract 5");
  assert(result.kind === "tentative_step", `Expected tentative_step, got ${result.kind}`);
  assert(result.extractedStep === "subtract 5", `Expected subtract 5, got ${result.extractedStep}`);
});

runTest("classifies should i divide by 3 as tentative_step", () => {
  const result = classifyStudentIntent("should i divide by 3?");
  assert(result.kind === "tentative_step", `Expected tentative_step, got ${result.kind}`);
  assert(result.extractedStep === "divide by 3", `Expected divide by 3, got ${result.extractedStep}`);
});

runTest("classifies i am not sure as help_request", () => {
  const result = classifyStudentIntent("i am not sure");
  assert(result.kind === "help_request", `Expected help_request, got ${result.kind}`);
  assert(result.extractedStep === null, `Expected null, got ${result.extractedStep}`);
});

runTest("classifies why subtract 5 as explanation_request", () => {
  const result = classifyStudentIntent("why subtract 5");
  assert(result.kind === "explanation_request", `Expected explanation_request, got ${result.kind}`);
  assert(result.extractedStep === "subtract 5", `Expected subtract 5, got ${result.extractedStep}`);
});

runTest("classifies do you subtract each side by 1 as tentative_step", () => {
  const result = classifyStudentIntent("do you subtract each side by 1");
  assert(result.kind === "tentative_step", `Expected tentative_step, got ${result.kind}`);
  assert(result.extractedStep === "subtract 1", `Expected subtract 1, got ${result.extractedStep}`);
});

runTest("classifies subtract x as direct_step", () => {
  const result = classifyStudentIntent("subtract x");
  assert(result.kind === "direct_step", `Expected direct_step, got ${result.kind}`);
  assert(result.extractedStep === "subtract x", `Expected subtract x, got ${result.extractedStep}`);
});

runTest("classifies subtract 2x as direct_step", () => {
  const result = classifyStudentIntent("subtract 2x");
  assert(result.kind === "direct_step", `Expected direct_step, got ${result.kind}`);
  assert(result.extractedStep === "subtract 2x", `Expected subtract 2x, got ${result.extractedStep}`);
});

runTest("classifies add x as direct_step", () => {
  const result = classifyStudentIntent("add x");
  assert(result.kind === "direct_step", `Expected direct_step, got ${result.kind}`);
  assert(result.extractedStep === "add x", `Expected add x, got ${result.extractedStep}`);
});

runTest("classifies add 3x as direct_step", () => {
  const result = classifyStudentIntent("add 3x");
  assert(result.kind === "direct_step", `Expected direct_step, got ${result.kind}`);
  assert(result.extractedStep === "add 3x", `Expected add 3x, got ${result.extractedStep}`);
});

runTest("classifies subtract x then divide by 2 as multi_step", () => {
  const result = classifyStudentIntent("subtract x then divide by 2");
  assert(result.kind === "multi_step", `Expected multi_step, got ${result.kind}`);
  assert(result.extractedStep === null, `Expected null, got ${result.extractedStep}`);
});

runTest("classifies 2x + 5 = 9 as direct_step", () => {
  const result = classifyStudentIntent("2x + 5 = 9");
  assert(result.kind === "direct_step", `Expected direct_step, got ${result.kind}`);
  assert(result.extractedStep === "2x+5=9", `Expected 2x+5=9, got ${result.extractedStep}`);
});