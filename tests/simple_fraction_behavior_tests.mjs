import {
  tryParseLinear,
  solveLinearFor,
  checkNextStepFor,
} from "../lib/algebra/linear/index.js";
import { createProblemState } from "../lib/tutor-core/session/problemState.js";
import { processStudentTurn } from "../lib/tutor-core/processStudentTurn.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function approxEqual(a, b, eps = 1e-12) {
  return Math.abs(a - b) <= eps;
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

runTest("solveLinear: 2/3x + 5 = 11 -> x = 9", async () => {
  const { version, parsed } = tryParseLinear("2/3x + 5 = 11");
  const solved = solveLinearFor(version, parsed);
  assert(approxEqual(solved.x, 9), `Expected x=9, got ${solved.x}`);
});

runTest("solveLinear: x/2 + 3 = 7 -> x = 8", async () => {
  const { version, parsed } = tryParseLinear("x/2 + 3 = 7");
  const solved = solveLinearFor(version, parsed);
  assert(approxEqual(solved.x, 8), `Expected x=8, got ${solved.x}`);
});

runTest(
  "processStudentTurn: 2/3x + 5 = 11 with subtract 5 -> STEP_HINT",
  async () => {
    const problemState = createProblemState("2/3x + 5 = 11");
    const result = await processStudentTurn({
      problemState,
      studentText: "subtract 5",
    });

    assert(
      result.mathResult?.kind === "STEP_HINT",
      `Expected STEP_HINT, got ${result.mathResult?.kind}`,
    );
  },
);

runTest(
  "processStudentTurn: 2/3x + 5 = 11 with x = 9 -> FINAL_CORRECT",
  async () => {
    const problemState = createProblemState("2/3x + 5 = 11");
    const result = await processStudentTurn({
      problemState,
      studentText: "x = 9",
    });

    assert(
      result.mathResult?.kind === "FINAL_CORRECT",
      `Expected FINAL_CORRECT, got ${result.mathResult?.kind}`,
    );
  },
);

runTest(
  "processStudentTurn: x/2 + 3 = 7 with subtract 3 -> STEP_HINT",
  async () => {
    const problemState = createProblemState("x/2 + 3 = 7");
    const result = await processStudentTurn({
      problemState,
      studentText: "subtract 3",
    });

    assert(
      result.mathResult?.kind === "STEP_HINT",
      `Expected STEP_HINT, got ${result.mathResult?.kind}`,
    );
  },
);

runTest(
  "processStudentTurn: x/2 + 3 = 7 with x = 8 -> FINAL_CORRECT",
  async () => {
    const problemState = createProblemState("x/2 + 3 = 7");
    const result = await processStudentTurn({
      problemState,
      studentText: "x = 8",
    });

    assert(
      result.mathResult?.kind === "FINAL_CORRECT",
      `Expected FINAL_CORRECT, got ${result.mathResult?.kind}`,
    );
  },
);

runTest(
  "intermediate equation: 2/3x = 6 is accepted as STEP_CORRECT",
  async () => {
    const problemState = createProblemState("2/3x + 5 = 11");
    const result = await processStudentTurn({
      problemState,
      studentText: "2/3x = 6",
    });

    assert(
      result.mathResult?.kind === "STEP_CORRECT",
      `Expected STEP_CORRECT, got ${result.mathResult?.kind}`,
    );
  },
);

runTest(
  "intermediate equation: x/2 = 4 is accepted as STEP_CORRECT",
  async () => {
    const problemState = createProblemState("x/2 + 3 = 7");
    const result = await processStudentTurn({
      problemState,
      studentText: "x/2 = 4",
    });

    assert(
      result.mathResult?.kind === "STEP_CORRECT",
      `Expected STEP_CORRECT, got ${result.mathResult?.kind}`,
    );
  },
);

runTest("fraction step parsing: divide by 2/3 is recognized", async () => {
  const { version, parsed } = tryParseLinear("2/3x = 6");
  const solved = solveLinearFor(version, parsed);
  const verdict = checkNextStepFor(version, "divide by 2/3", solved);

  assert(
    verdict.kind === "STEP_HINT",
    `Expected STEP_HINT, got ${verdict.kind}`,
  );
  assert(
    verdict.stage === "DIVIDE_BY_A",
    `Expected DIVIDE_BY_A, got ${verdict.stage}`,
  );
});

runTest("fraction step parsing: subtract 1/2 is recognized", async () => {
  const { version, parsed } = tryParseLinear("x + 0.5 = 2");
  const solved = solveLinearFor(version, parsed);
  const verdict = checkNextStepFor(version, "subtract 1/2", solved);

  assert(
    verdict.kind === "STEP_HINT",
    `Expected STEP_HINT, got ${verdict.kind}`,
  );
  assert(
    verdict.stage === "SUBTRACT_B",
    `Expected SUBTRACT_B, got ${verdict.stage}`,
  );
});

runTest("fraction step parsing: add 1/2 is recognized", async () => {
  const { version, parsed } = tryParseLinear("x - 0.5 = 2");
  const solved = solveLinearFor(version, parsed);
  const verdict = checkNextStepFor(version, "add 1/2", solved);

  assert(
    verdict.kind === "STEP_HINT",
    `Expected STEP_HINT, got ${verdict.kind}`,
  );
  assert(
    verdict.stage === "SUBTRACT_B",
    `Expected SUBTRACT_B, got ${verdict.stage}`,
  );
});

runTest("fraction step parsing: x = 1/3 is recognized as final", async () => {
  const problemState = createProblemState("3x = 1");
  const result = await processStudentTurn({
    problemState,
    studentText: "x = 1/3",
  });

  assert(
    result.mathResult?.kind === "FINAL_CORRECT",
    `Expected FINAL_CORRECT, got ${result.mathResult?.kind}`,
  );
});

runTest(
  "equivalent operation: x/2 = 1 with multiply by 2 is accepted",
  async () => {
    const problemState = createProblemState("x/2 + 1 = 2");
    const afterIsolate = await processStudentTurn({
      problemState,
      studentText: "x/2 = 1",
    });

    assert(
      afterIsolate.mathResult?.kind === "STEP_CORRECT",
      `Expected STEP_CORRECT on isolation, got ${afterIsolate.mathResult?.kind}`,
    );

    const afterMultiply = await processStudentTurn({
      problemState: afterIsolate.problemState,
      studentText: "multiply by 2",
    });

    assert(
      afterMultiply.mathResult?.kind === "STEP_HINT",
      `Expected STEP_HINT, got ${afterMultiply.mathResult?.kind}`,
    );
    assert(
      afterMultiply.mathResult?.stage === "DIVIDE_BY_A",
      `Expected DIVIDE_BY_A, got ${afterMultiply.mathResult?.stage}`,
    );
  },
);
