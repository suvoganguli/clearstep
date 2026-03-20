import {
  createProblemState,
  setAwaitingConfirmation,
} from "../lib/tutor-core/session/problemState.js";
import { processStudentTurn } from "../lib/tutor-core/processStudentTurn.js";
import { buildTutorReply } from "../lib/tutor-core/dialogue/buildTutorReply.js";

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

runTest("'what should i do' routes to help_tutorial", async () => {
  const problemState = createProblemState("3x + 15 = 30");

  const result = await processStudentTurn({
    problemState,
    studentText: "what should i do",
  });

  assert(
    result.routeResult.route === "help_tutorial",
    `Expected help_tutorial, got ${result.routeResult.route}`
  );
});

runTest("'what do i do' routes to help_tutorial", async () => {
  const problemState = createProblemState("3x + 15 = 30");

  const result = await processStudentTurn({
    problemState,
    studentText: "what do i do",
  });

  assert(
    result.routeResult.route === "help_tutorial",
    `Expected help_tutorial, got ${result.routeResult.route}`
  );
});

runTest("'what now' routes to help_tutorial", async () => {
  const problemState = createProblemState("3x + 15 = 30");

  const result = await processStudentTurn({
    problemState,
    studentText: "what now",
  });

  assert(
    result.routeResult.route === "help_tutorial",
    `Expected help_tutorial, got ${result.routeResult.route}`
  );
});

runTest("'what now' uses light help_tutorial response", async () => {
  const problemState = createProblemState("3x + 15 = 30");

  const result = await processStudentTurn({
    problemState,
    studentText: "what now",
  });

  assert(
    !result.reply.tutorText.includes("Example:"),
    "Did not expect full worked example in light help response"
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

runTest("ask_for_answer routes 'give me the answer' before step parsing", async () => {
  const problemState = createProblemState("3x + 5 = 20");

  const result = await processStudentTurn({
    problemState,
    studentText: "give me the answer",
  });

  assert(
    result.routeResult.route === "ask_for_answer",
    `Expected ask_for_answer, got ${result.routeResult.route}`
  );
  assert(
    result.mathResult === null,
    "Expected mathResult to remain null for ask_for_answer"
  );
});

runTest("ask_for_answer routes 'just tell me x' before step parsing", async () => {
  const problemState = createProblemState("3x + 5 = 20");

  const result = await processStudentTurn({
    problemState,
    studentText: "just tell me x",
  });

  assert(
    result.routeResult.route === "ask_for_answer",
    `Expected ask_for_answer, got ${result.routeResult.route}`
  );
  assert(
    result.mathResult === null,
    "Expected mathResult to remain null for ask_for_answer"
  );
});

runTest("normal math step flow remains unchanged after ask_for_answer hook", async () => {
  const problemState = createProblemState("3x + 5 = 20");

  const result = await processStudentTurn({
    problemState,
    studentText: "subtract 5",
  });

  assert(
    result.routeResult.route === "accept_step",
    `Expected accept_step, got ${result.routeResult.route}`
  );
  assert(
    result.mathResult?.kind === "STEP_HINT",
    `Expected STEP_HINT, got ${result.mathResult?.kind}`
  );
});

runTest("proposed final answer question 'is x = 5?' stays on math path", async () => {
  const problemState = createProblemState("3x + 5 = 20");

  const result = await processStudentTurn({
    problemState,
    studentText: "is x = 5?",
  });

  assert(
    result.routeResult.route !== "ask_for_answer",
    "Did not expect ask_for_answer route for proposed final answer question"
  );
  assert(
    result.mathResult?.kind === "FINAL_CORRECT",
    `Expected FINAL_CORRECT, got ${result.mathResult?.kind}`
  );
});

runTest("proposed answer check 'do i get x = 5?' does not route to ask_for_answer", async () => {
  const problemState = createProblemState("3x + 5 = 20");

  const result = await processStudentTurn({
    problemState,
    studentText: "do i get x = 5?",
  });

  assert(
    result.routeResult.route !== "ask_for_answer",
    "Did not expect ask_for_answer route for answer-check wording"
  );
});

runTest("'what is x' is classified as ask_for_answer", async () => {
  const problemState = createProblemState("3x + 5 = 20");

  const result = await processStudentTurn({
    problemState,
    studentText: "what is x",
  });

  assert(
    result.routeResult.route === "ask_for_answer",
    `Expected ask_for_answer, got ${result.routeResult.route}`
  );
  assert(
    result.mathResult === null,
    "Expected mathResult to remain null for ask_for_answer"
  );
});

runTest("help_question + ask_for_help gets specific tentative-operation reply", async () => {
  const reply = buildTutorReply({
    routeResult: {
      route: "help_question",
      match: {
        stepType: "ask_for_help",
        valueRaw: null,
        rawText: "subtract?",
      },
    },
    mathResult: {},
    priorHelpContext: null,
  });

  assert(
    reply.tutorText.includes("First choose what you want to undo"),
    "Expected specific tentative-operation guidance"
  );
  assert(
    !reply.tutorText.includes("You’re thinking about the equation, which is good."),
    "Did not expect generic fallback reply"
  );
});