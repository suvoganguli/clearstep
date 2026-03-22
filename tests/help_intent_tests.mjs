import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { detectHelpIntent } from "../lib/tutor-core/help/detectHelpIntent.js";

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

const policiesDir = path.join(process.cwd(), "policies");
const helpIntentPolicy = {
  light_help_phrases: yaml.load(
    fs.readFileSync(path.join(policiesDir, "lightHelpPhrases.yaml"), "utf8")
  ).light_help_phrases,
  full_help_phrases: yaml.load(
    fs.readFileSync(path.join(policiesDir, "fullHelpPhrases.yaml"), "utf8")
  ).full_help_phrases,
};

runTest("detects 'i dont know' as full help intent", () => {
  const result = detectHelpIntent("i dont know", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "full", `Expected full, got ${result.helpStyle}`);
});

runTest("does not treat 'do i subtract 5?' as generic help (help_question path)", () => {
  const result = detectHelpIntent("do i subtract 5?", helpIntentPolicy);
  assert(result.isHelpIntent === false, "Expected isHelpIntent === false");
});

runTest("detects 'help' as full help intent", () => {
  const result = detectHelpIntent("help", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "full", `Expected full, got ${result.helpStyle}`);
});

runTest("detects 'help me' as full help intent", () => {
  const result = detectHelpIntent("help me", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "full", `Expected full, got ${result.helpStyle}`);
});

runTest("detects 'i don't know how to proceed' as full help intent", () => {
  const result = detectHelpIntent("i don't know how to proceed", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "full", `Expected full, got ${result.helpStyle}`);
});

runTest("detects 'i dont know how to proceed' as full help intent", () => {
  const result = detectHelpIntent("i dont know how to proceed", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "full", `Expected full, got ${result.helpStyle}`);
});

runTest("detects 'i'm stuck' as light help intent (exact match wins)", () => {
  const result = detectHelpIntent("i'm stuck", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "light", `Expected light, got ${result.helpStyle}`);
});

runTest("detects 'im stuck' as light help intent", () => {
  const result = detectHelpIntent("im stuck", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "light", `Expected light, got ${result.helpStyle}`);
});

runTest("detects 'i am stuck' as light help intent (config-driven)", () => {
  const result = detectHelpIntent("i am stuck", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "light", `Expected light, got ${result.helpStyle}`);
});

runTest("detects 'what should i do next' as full help (not exact light phrase)", () => {
  const result = detectHelpIntent("what should i do next", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "full", `Expected full, got ${result.helpStyle}`);
});

runTest("detects 'what should i do' as light help intent (exact before substring)", () => {
  const result = detectHelpIntent("what should i do", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "light", `Expected light, got ${result.helpStyle}`);
});

runTest("detects 'what should i do?' as light help (trailing ? stripped for light match)", () => {
  const result = detectHelpIntent("what should i do?", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "light", `Expected light, got ${result.helpStyle}`);
});

runTest("detects 'what do i do' as light help intent", () => {
  const result = detectHelpIntent("what do i do", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "light", `Expected light, got ${result.helpStyle}`);
});

runTest("detects 'what now' as light help intent", () => {
  const result = detectHelpIntent("what now", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "light", `Expected light, got ${result.helpStyle}`);
});

runTest("detects 'can you show me an example' as full help intent", () => {
  const result = detectHelpIntent("can you show me an example", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
  assert(result.helpStyle === "full", `Expected full, got ${result.helpStyle}`);
});

runTest("does not classify 'subtract 5' as help intent", () => {
  const result = detectHelpIntent("subtract 5", helpIntentPolicy);
  assert(result.isHelpIntent === false, "Expected isHelpIntent === false");
});

runTest("does not classify 'subtract x' as help intent", () => {
  const result = detectHelpIntent("subtract x", helpIntentPolicy);
  assert(result.isHelpIntent === false, "Expected isHelpIntent === false");
});

runTest("does not classify 'x = 5' as help intent", () => {
  const result = detectHelpIntent("x = 5", helpIntentPolicy);
  assert(result.isHelpIntent === false, "Expected isHelpIntent === false");
});

runTest("does not classify '3x = 15' as help intent", () => {
  const result = detectHelpIntent("3x = 15", helpIntentPolicy);
  assert(result.isHelpIntent === false, "Expected isHelpIntent === false");
});

runTest("does not classify 'why subtract 5' as help intent", () => {
  const result = detectHelpIntent("why subtract 5", helpIntentPolicy);
  assert(result.isHelpIntent === false, "Expected isHelpIntent === false");
});
