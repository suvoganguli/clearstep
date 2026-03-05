import { parseAxPlusBEqualsC } from "./v1/parser.js";
import { solveLinear, checkNextStep } from "./v1/engine.js";

/**
 * Linear Algebra Router (Phase 1)
 * - v1 supports: ax + b = c (integers)
 * - Later we can add v2 (x on both sides), v3 (distribution), etc.
 */

export function tryParseLinear(problemText) {
  // v1 attempt
  const parsed = parseAxPlusBEqualsC(problemText);
  return { version: "v1", parsed };
}

export function solveLinearFor(version, parsed) {
  if (version === "v1") return solveLinear(parsed);
  throw new Error(`Unsupported linear version: ${version}`);
}

export function checkNextStepFor(version, studentText, solved) {
  if (version === "v1") return checkNextStep(studentText, solved);
  throw new Error(`Unsupported linear version: ${version}`);
}
