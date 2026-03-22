/**
 * help_question requires llmHelpIntentClassifier; mock OpenAI when key is set.
 */
import { createProblemState } from "../lib/tutor-core/session/problemState.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const origFetch = globalThis.fetch;
const origKey = process.env.OPENAI_API_KEY;

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

runTest("'do i subtract 5?' routes to help_question when LLM classifies help_question", async () => {
  try {
    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "help_question",
                stepType: "subtract_constant",
                valueRaw: "5",
                confidence: 0.9,
              }),
            },
          },
        ],
      }),
    });

    const { processStudentTurn } = await import(
      "../lib/tutor-core/processStudentTurn.js"
    );
    const problemState = createProblemState("3x + 15 = 30");
    const result = await processStudentTurn({
      problemState,
      studentText: "do i subtract 5?",
    });

    assert(
      result.routeResult.route === "help_question",
      `Expected help_question, got ${result.routeResult.route}`
    );
    assert(
      result.routeResult.match?.stepType === "subtract_constant",
      "Expected help_question match stepType"
    );
  } finally {
    globalThis.fetch = origFetch;
    if (origKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = origKey;
    }
  }
});
