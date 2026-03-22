import { llmHelpIntentClassifier } from "../lib/tutor-core/help/llmHelpIntentClassifier.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const origFetch = globalThis.fetch;
const origKey = process.env.OPENAI_API_KEY;

function mockResponse(contentObj) {
  return {
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content:
              typeof contentObj === "string"
                ? contentObj
                : JSON.stringify(contentObj),
          },
        },
      ],
    }),
  };
}

async function main() {
  try {
    delete process.env.OPENAI_API_KEY;
    const u = await llmHelpIntentClassifier("intent-unavail", { steps: [] });
    assert(u.kind === "unavailable", `expected unavailable, got ${u.kind}`);
    console.log("PASS: llmHelpIntentClassifier returns unavailable without API key");

    process.env.OPENAI_API_KEY = "k";
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    const e1 = await llmHelpIntentClassifier("intent-err-http", { steps: [] });
    assert(e1.kind === "error", `expected error, got ${e1.kind}`);
    console.log("PASS: llmHelpIntentClassifier returns error when HTTP not ok");

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: {} }] }),
    });
    const e2 = await llmHelpIntentClassifier("intent-err-empty", { steps: [] });
    assert(e2.kind === "error", `expected error, got ${e2.kind}`);
    console.log("PASS: llmHelpIntentClassifier returns error when content missing");

    globalThis.fetch = async () => mockResponse("not{json");
    const e3 = await llmHelpIntentClassifier("intent-err-parse", { steps: [] });
    assert(e3.kind === "error", `expected error, got ${e3.kind}`);
    console.log("PASS: llmHelpIntentClassifier returns error on invalid JSON");

    globalThis.fetch = async () => mockResponse("[]");
    const e4 = await llmHelpIntentClassifier("intent-err-shape", { steps: [] });
    assert(e4.kind === "error", `expected error, got ${e4.kind}`);
    console.log("PASS: llmHelpIntentClassifier returns error when JSON is not an object");

    globalThis.fetch = async () =>
      mockResponse({
        intent: "unknown",
        stepType: "subtract_constant",
        valueRaw: "5",
        confidence: 0.99,
      });
    const n1 = await llmHelpIntentClassifier("intent-no-unknown", { steps: [] });
    assert(n1.kind === "no_match", `expected no_match, got ${n1.kind}`);
    console.log("PASS: llmHelpIntentClassifier returns no_match for intent unknown");

    globalThis.fetch = async () =>
      mockResponse({
        intent: "step_attempt",
        stepType: "subtract_constant",
        valueRaw: "5",
        confidence: 0.99,
      });
    const n2 = await llmHelpIntentClassifier("intent-no-step", { steps: [] });
    assert(n2.kind === "no_match", `expected no_match, got ${n2.kind}`);
    console.log("PASS: llmHelpIntentClassifier returns no_match for intent step_attempt");

    globalThis.fetch = async () =>
      mockResponse({
        intent: "help_question",
        stepType: null,
        valueRaw: null,
        confidence: 0.95,
      });
    const n3 = await llmHelpIntentClassifier("intent-no-hq-notype", { steps: [] });
    assert(n3.kind === "no_match", `expected no_match, got ${n3.kind}`);
    console.log(
      "PASS: llmHelpIntentClassifier returns no_match for help_question without stepType"
    );

    globalThis.fetch = async () =>
      mockResponse({
        intent: "help_question",
        stepType: "   ",
        valueRaw: null,
        confidence: 0.95,
      });
    const n4 = await llmHelpIntentClassifier("intent-no-hq-blank", { steps: [] });
    assert(n4.kind === "no_match", `expected no_match, got ${n4.kind}`);
    console.log(
      "PASS: llmHelpIntentClassifier returns no_match for help_question with blank stepType"
    );

    globalThis.fetch = async () =>
      mockResponse({
        intent: "help_question",
        stepType: "subtract_constant",
        valueRaw: "5",
        confidence: 0.5,
      });
    const n5 = await llmHelpIntentClassifier("intent-no-lowconf", { steps: [] });
    assert(n5.kind === "no_match", `expected no_match, got ${n5.kind}`);
    console.log(
      "PASS: llmHelpIntentClassifier returns no_match when confidence below threshold"
    );

    globalThis.fetch = async () =>
      mockResponse({
        intent: "help_question",
        stepType: "subtract_constant",
        valueRaw: "5",
        confidence: 0.6,
      });
    const m = await llmHelpIntentClassifier("intent-match", {
      steps: ["subtract_constant"],
    });
    assert(m.kind === "match", `expected match, got ${m.kind}`);
    assert(m.result.intent === "help_question", "expected help_question");
    assert(m.result.stepType === "subtract_constant", "expected stepType");
    assert(m.result.confidence === 0.6, "expected confidence");
    assert(m.result.rawText === "intent-match", "expected rawText");
    console.log("PASS: llmHelpIntentClassifier returns match for usable help_question");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    globalThis.fetch = origFetch;
    if (origKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = origKey;
    }
  }
}

main();
