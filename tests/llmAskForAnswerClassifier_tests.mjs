import { llmAskForAnswerClassifier } from "../lib/tutor-core/intent/llmAskForAnswerClassifier.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const origFetch = globalThis.fetch;
const origKey = process.env.OPENAI_API_KEY;

const enabledConfig = {
  intents: {
    ask_for_answer: {
      enabled: true,
      confidence_threshold: 0.7,
      phrases: ["give me the answer", "what is x"],
    },
  },
};

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
    const n0 = await llmAskForAnswerClassifier(
      "is x = 5?",
      enabledConfig
    );
    assert(n0.kind === "no_match", `regex bail-out: expected no_match, got ${n0.kind}`);
    console.log("PASS: returns no_match for proposed-answer regex bail-out");

    const nDisabled = await llmAskForAnswerClassifier(
      "give me the answer",
      { intents: { ask_for_answer: { enabled: false, phrases: [] } } }
    );
    assert(
      nDisabled.kind === "no_match",
      `disabled: expected no_match, got ${nDisabled.kind}`
    );
    console.log("PASS: returns no_match when ask_for_answer is disabled");

    const mPhrase = await llmAskForAnswerClassifier(
      "please give me the answer now",
      enabledConfig
    );
    assert(mPhrase.kind === "match", `phrase: expected match, got ${mPhrase.kind}`);
    assert(mPhrase.result.intent === "ask_for_answer", "expected intent");
    assert(mPhrase.result.confidence === 1, "expected confidence 1");
    assert(
      typeof mPhrase.result.matchedPhrase === "string",
      "expected matchedPhrase"
    );
    console.log("PASS: returns match on deterministic phrase hit");

    process.env.OPENAI_API_KEY = "k";
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    const e1 = await llmAskForAnswerClassifier("subtract 5", enabledConfig);
    assert(e1.kind === "error", `expected error, got ${e1.kind}`);
    console.log("PASS: returns error when HTTP not ok (LLM path)");

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: {} }] }),
    });
    const e2 = await llmAskForAnswerClassifier("subtract 5", enabledConfig);
    assert(e2.kind === "error", `expected error, got ${e2.kind}`);
    console.log("PASS: returns error when message content missing");

    globalThis.fetch = async () => mockResponse("not{json");
    const e3 = await llmAskForAnswerClassifier("subtract 5", enabledConfig);
    assert(e3.kind === "error", `expected error, got ${e3.kind}`);
    console.log("PASS: returns error on invalid JSON");

    globalThis.fetch = async () => mockResponse("[]");
    const e4 = await llmAskForAnswerClassifier("subtract 5", enabledConfig);
    assert(e4.kind === "error", `expected error, got ${e4.kind}`);
    console.log("PASS: returns error when JSON is not an object");

    globalThis.fetch = async () =>
      mockResponse({ intent: "unknown", confidence: 0.99 });
    const n1 = await llmAskForAnswerClassifier("subtract 5", enabledConfig);
    assert(n1.kind === "no_match", `expected no_match, got ${n1.kind}`);
    console.log("PASS: returns no_match when LLM says unknown");

    globalThis.fetch = async () =>
      mockResponse({ intent: "ask_for_answer", confidence: 0.5 });
    const n2 = await llmAskForAnswerClassifier("subtract 5", enabledConfig);
    assert(n2.kind === "no_match", `expected no_match, got ${n2.kind}`);
    console.log("PASS: returns no_match when confidence below threshold");

    globalThis.fetch = async () =>
      mockResponse({ intent: "ask_for_answer", confidence: 0.7 });
    const mLlm = await llmAskForAnswerClassifier("tell me x now", enabledConfig);
    assert(mLlm.kind === "match", `expected match, got ${mLlm.kind}`);
    assert(mLlm.result.matchedPhrase === null, "expected null matchedPhrase from LLM");
    assert(mLlm.result.confidence === 0.7, "expected confidence");
    console.log("PASS: returns match when LLM ask_for_answer meets threshold");

    delete process.env.OPENAI_API_KEY;
    const u = await llmAskForAnswerClassifier("no phrase hit here", enabledConfig);
    assert(u.kind === "unavailable", `expected unavailable, got ${u.kind}`);
    console.log("PASS: returns unavailable when API key missing on LLM path");

    const mNoLlm = await llmAskForAnswerClassifier(
      "what is x?",
      enabledConfig
    );
    assert(
      mNoLlm.kind === "match",
      `phrase path without key should still match, got ${mNoLlm.kind}`
    );
    console.log("PASS: phrase match does not require API key");
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
