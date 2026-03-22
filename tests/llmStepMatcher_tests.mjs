import { llmStepMatcher } from "../lib/tutor-core/routing/llmStepMatcher.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const origFetch = globalThis.fetch;
const origKey = process.env.OPENAI_API_KEY;

async function main() {
  try {
    delete process.env.OPENAI_API_KEY;
    const u = await llmStepMatcher("outcome-unavailable-1", { steps: [] });
    assert(u.kind === "unavailable", `expected unavailable, got ${u.kind}`);
    console.log("PASS: llmStepMatcher returns unavailable when OPENAI_API_KEY is missing");

    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    const e1 = await llmStepMatcher("outcome-error-http", { steps: [] });
    assert(e1.kind === "error", `expected error, got ${e1.kind}`);
    console.log("PASS: llmStepMatcher returns error when response is not ok");

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: {} }] }),
    });
    const e2 = await llmStepMatcher("outcome-error-empty", { steps: [] });
    assert(e2.kind === "error", `expected error, got ${e2.kind}`);
    console.log("PASS: llmStepMatcher returns error when message content is missing");

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not-json{" } }],
      }),
    });
    const e3 = await llmStepMatcher("outcome-error-parse", { steps: [] });
    assert(e3.kind === "error", `expected error, got ${e3.kind}`);
    console.log("PASS: llmStepMatcher returns error when JSON body is invalid");

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ stepType: null, confidence: 0.1 }) } }],
      }),
    });
    const n1 = await llmStepMatcher("outcome-no-match-null", {
      steps: ["move_x_term"],
    });
    assert(n1.kind === "no_match", `expected no_match, got ${n1.kind}`);
    console.log("PASS: llmStepMatcher returns no_match when stepType is null");

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                stepType: "bogus_type",
                valueRaw: null,
                confidence: 0.9,
              }),
            },
          },
        ],
      }),
    });
    const n2 = await llmStepMatcher("outcome-no-match-unknown", {
      steps: ["move_x_term"],
    });
    assert(n2.kind === "no_match", `expected no_match, got ${n2.kind}`);
    console.log("PASS: llmStepMatcher returns no_match when stepType is not in allowed list");

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                stepType: 42,
                confidence: 1,
              }),
            },
          },
        ],
      }),
    });
    const n3 = await llmStepMatcher("outcome-no-match-bad-type", {
      steps: ["move_x_term"],
    });
    assert(n3.kind === "no_match", `expected no_match, got ${n3.kind}`);
    console.log("PASS: llmStepMatcher returns no_match when stepType is not a string");

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                stepType: "   ",
                confidence: 0.5,
              }),
            },
          },
        ],
      }),
    });
    const n4 = await llmStepMatcher("outcome-no-match-blank", {
      steps: ["move_x_term"],
    });
    assert(n4.kind === "no_match", `expected no_match, got ${n4.kind}`);
    console.log("PASS: llmStepMatcher returns no_match when stepType is whitespace-only");

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "[]" } }],
      }),
    });
    const e4 = await llmStepMatcher("outcome-error-non-object-json", { steps: [] });
    assert(e4.kind === "error", `expected error, got ${e4.kind}`);
    console.log("PASS: llmStepMatcher returns error when JSON parses to a non-object");

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                stepType: "move_x_term",
                valueRaw: "x",
                confidence: 0.88,
              }),
            },
          },
        ],
      }),
    });
    const m = await llmStepMatcher("outcome-match-ok", {
      steps: ["move_x_term"],
    });
    assert(m.kind === "match", `expected match, got ${m.kind}`);
    assert(m.match.source === "llm", "expected llm source");
    assert(m.match.stepType === "move_x_term", "expected stepType");
    assert(m.match.confidence === 0.88, "expected confidence");
    assert(m.match.rawText === "outcome-match-ok", "expected rawText");
    console.log("PASS: llmStepMatcher returns match on successful completion");
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
