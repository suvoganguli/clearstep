import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { detectHelpIntent } from "../lib/tutor/help/detectHelpIntent.js";

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

const helpIntentPolicyPath = path.join(
  process.cwd(),
  "policies",
  "helpIntentPhrases.yaml"
);
const helpIntentPolicy = yaml.load(
  fs.readFileSync(helpIntentPolicyPath, "utf8")
);

runTest("detects 'help' as help intent", () => {
  const result = detectHelpIntent("help", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
});

runTest("detects 'help me' as help intent", () => {
  const result = detectHelpIntent("help me", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
});

runTest("detects 'i don't know how to proceed' as help intent", () => {
  const result = detectHelpIntent("i don't know how to proceed", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
});

runTest("detects 'i dont know how to proceed' as help intent", () => {
  const result = detectHelpIntent("i dont know how to proceed", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
});

runTest("detects 'i'm stuck' as help intent", () => {
  const result = detectHelpIntent("i'm stuck", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
});

runTest("detects 'im stuck' as help intent", () => {
  const result = detectHelpIntent("im stuck", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
});

runTest("detects 'what should i do next' as help intent", () => {
  const result = detectHelpIntent("what should i do next", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
});

runTest("detects 'can you show me an example' as help intent", () => {
  const result = detectHelpIntent("can you show me an example", helpIntentPolicy);
  assert(result.isHelpIntent === true, "Expected isHelpIntent === true");
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