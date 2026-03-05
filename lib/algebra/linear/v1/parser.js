import { normalizeEquationText } from "../../common/textNormalize.js";

export function parseAxPlusBEqualsC(equationStr) {
  if (typeof equationStr !== "string") {
    throw new Error("Equation must be a string.");
  }

  // Normalize first (handles spacing, X->x, trailing punctuation, unicode minus, etc.)
  const equation = normalizeEquationText(equationStr);

  // Remove spaces for parsing
  const clean = equation.replace(/\s+/g, "");
  const parts = clean.split("=");

  if (parts.length !== 2) {
    throw new Error("Equation must contain exactly one '='.");
  }

  const left = parts[0];
  const right = parts[1];

  // Right side must be an integer (allow optional leading + or -)
  if (!/^[+-]?\d+$/.test(right)) {
    throw new Error("Right side must be an integer (Phase 1A).");
  }
  const c = parseInt(right, 10);

  // Left side must look like: ax + b
  // Supported examples:
  //   x+5, -x+5, 3x-5, 3x, x, -x, +x+5
  // coef: "", "+", "-", digits, "+digits", "-digits"
  // b: optional signed integer like +5 or -7
  const m = left.match(/^([+-]?\d*)x([+-]\d+)?$/);
  if (!m) {
    throw new Error("Left side must match ax+b with variable 'x' (Phase 1A).");
  }

  const coefRaw = m[1]; // "", "+", "-", "3", "-2", "+4"
  const bRaw = m[2];    // undefined or "+5" or "-7"

  let a;
  if (coefRaw === "" || coefRaw === "+") a = 1;
  else if (coefRaw === "-") a = -1;
  else a = parseInt(coefRaw, 10);

  const b = bRaw ? parseInt(bRaw, 10) : 0;

  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c)) {
    throw new Error("Non-integer coefficient detected (Phase 1A).");
  }

  if (a === 0) {
    throw new Error("Not a valid linear equation (a cannot be 0).");
  }

  return { a, b, c };
}