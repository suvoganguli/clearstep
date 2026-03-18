import {
  createProblemState,
  setAwaitingConfirmation,
} from "../lib/tutor/session/problemState.js";
import { processStudentTurn } from "../lib/tutor/processStudentTurn.js";

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

runTest("help request enters help mode on one-sided equation", async () => {
  const problemState = createProblemState("3x + 15 = 30");

  const result = await processStudentTurn({
    problemState,
    studentText: "help",
  });

  assert(
    result.routeResult.route === "help_tutorial",
    `Expected help_tutorial, got ${result.routeResult.route}`
  );
  assert(
    result.problemState.helpContext?.active === true,
    "Expected helpContext.active === true"
  );
  assert(
    result.reply.tutorText.includes("Get the constant away from the x-term."),
    "Expected one-sided help text"
  );
});

runTest("help request enters two-sided help mode on ax+b=cx+d equation", async () => {
  const problemState = createProblemState("4x + 15 = 30 + x");

  const result = await processStudentTurn({
    problemState,
    studentText: "help",
  });

  assert(
    result.routeResult.route === "help_tutorial",
    `Expected help_tutorial, got ${result.routeResult.route}`
  );
  assert(
    result.problemState.helpContext?.active === true,
    "Expected helpContext.active === true"
  );
  assert(
    result.reply.tutorText.includes("Move all x-terms to one side."),
    "Expected two-sided help text"
  );
});

runTest("help mode clears on the next normal student turn", async () => {
  const problemState = createProblemState("3x + 15 = 30");

  const afterHelp = await processStudentTurn({
    problemState,
    studentText: "help",
  });

  const afterStep = await processStudentTurn({
    problemState: afterHelp.problemState,
    studentText: "subtract 15",
  });

  assert(
    afterStep.routeResult.route === "accept_step",
    `Expected accept_step, got ${afterStep.routeResult.route}`
  );
  assert(
    afterStep.problemState.helpContext === null,
    "Expected helpContext to be cleared after next normal turn"
  );
});

runTest("awaitingConfirmation yes takes precedence over help detection", async () => {
  let problemState = createProblemState("3x + 5 = 20");

  problemState = setAwaitingConfirmation(problemState, {
    stepType: "subtract_constant",
    valueRaw: "5",
    rawText: "subtract 5",
  });

  const result = await processStudentTurn({
    problemState,
    studentText: "yes",
  });

  assert(
    result.routeResult.route === "accept_step",
    `Expected accept_step, got ${result.routeResult.route}`
  );
  assert(
    result.problemState.awaitingConfirmation === null,
    "Expected awaitingConfirmation to be cleared"
  );
});

runTest("awaitingConfirmation no takes precedence over help detection", async () => {
  let problemState = createProblemState("3x + 5 = 20");

  problemState = setAwaitingConfirmation(problemState, {
    stepType: "subtract_constant",
    valueRaw: "5",
    rawText: "subtract 5",
  });

  const result = await processStudentTurn({
    problemState,
    studentText: "no",
  });

  assert(
    result.routeResult.route === "recovery_prompt",
    `Expected recovery_prompt, got ${result.routeResult.route}`
  );
  assert(
    result.problemState.awaitingConfirmation === null,
    "Expected awaitingConfirmation to be cleared"
  );
});

runTest("wrong x-term after help gets corrective feedback, not encouragement", async () => {
  const problemState = createProblemState("4x + 5 = 20 + x");

  const afterHelp = await processStudentTurn({
    problemState,
    studentText: "help",
  });

  const afterWrongStep = await processStudentTurn({
    problemState: afterHelp.problemState,
    studentText: "subtract 5x",
  });

  assert(
    afterWrongStep.routeResult.route === "accept_step",
    `Expected accept_step, got ${afterWrongStep.routeResult.route}`
  );
  assert(
    afterWrongStep.mathResult?.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${afterWrongStep.mathResult?.kind}`
  );
  assert(
    afterWrongStep.reply.tutorText.includes("subtract x"),
    "Expected reply to suggest subtract x"
  );
  assert(
    afterWrongStep.reply.tutorText.includes('"help"') ||
      afterWrongStep.reply.tutorText.includes("help"),
    'Expected reply to mention "help"'
  );
  assert(
    !afterWrongStep.reply.tutorText.includes("Good idea"),
    'Did not expect encouraging "Good idea" reply'
  );
});

runTest("wrong x-term without help still gets corrective feedback", async () => {
  const problemState = createProblemState("4x + 5 = 20 + x");

  const result = await processStudentTurn({
    problemState,
    studentText: "subtract 5x",
  });

  assert(
    result.routeResult.route === "accept_step",
    `Expected accept_step, got ${result.routeResult.route}`
  );
  assert(
    result.mathResult?.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${result.mathResult?.kind}`
  );
  assert(
    result.reply.tutorText.includes("subtract x"),
    "Expected reply to suggest subtract x"
  );
});

runTest("correct x-term after help proceeds normally", async () => {
  const problemState = createProblemState("4x + 5 = 20 + x");

  const afterHelp = await processStudentTurn({
    problemState,
    studentText: "help",
  });

  const afterCorrectStep = await processStudentTurn({
    problemState: afterHelp.problemState,
    studentText: "subtract x",
  });

  assert(
    afterCorrectStep.routeResult.route === "accept_step",
    `Expected accept_step, got ${afterCorrectStep.routeResult.route}`
  );
  assert(
    afterCorrectStep.mathResult?.kind === "STEP_HINT",
    `Expected STEP_HINT, got ${afterCorrectStep.mathResult?.kind}`
  );
  assert(
    afterCorrectStep.reply.tutorText.includes("What equation do you get?"),
    'Expected follow-up prompt asking "What equation do you get?"'
  );
});

runTest("wrong constant after help gets corrective feedback", async () => {
  const problemState = createProblemState("3x + 15 = 30");

  const afterHelp = await processStudentTurn({
    problemState,
    studentText: "help",
  });

  const afterWrongStep = await processStudentTurn({
    problemState: afterHelp.problemState,
    studentText: "subtract 5",
  });

  assert(
    afterWrongStep.mathResult?.kind === "STEP_INCORRECT",
    `Expected STEP_INCORRECT, got ${afterWrongStep.mathResult?.kind}`
  );
  assert(
    afterWrongStep.reply.tutorText.includes("subtract 15"),
    "Expected reply to suggest subtract 15"
  );
});