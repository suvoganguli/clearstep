// lib/algebra/linearParser.js
// Parses: ax + b = c  (integers only, one variable x)
// Examples:
//  "3x + 5 = 20" -> { a: 3, b: 5, c: 20 }
//  "-x-7=9" -> { a: -1, b: -7, c: 9 }
//  "x+4=10" -> { a: 1, b: 4, c: 10 }

export function parseAxPlusBEqualsC(equationStr) {
  if (typeof equationStr !== "string") throw new Error("Equation must be a string.");

  const clean = equationStr.replace(/\s+/g, "");
  const parts = clean.split("=");

  if (parts.length !== 2) throw new Error("Equation must contain exactly one '='.");

  const left = parts[0];
  const right = parts[1];

  // right must be integer
  if (!/^-?\d+$/.test(right)) throw new Error("Right side must be an integer (Phase 1A).");
  const c = parseInt(right, 10);

  // left must look like: [coef]x[+/-b]
  // coef: "", "+", "-", digits, "-digits"
  // b: optional signed integer
  const m = left.match(/^([+-]?\d*)x([+-]\d+)?$/);
  if (!m) throw new Error("Left side must match ax+b with variable 'x' (Phase 1A).");

  const coefRaw = m[1]; // "", "+", "-", "3", "-2"
  const bRaw = m[2]; // undefined or "+5" or "-7"

  let a;
  if (coefRaw === "" || coefRaw === "+") a = 1;
  else if (coefRaw === "-") a = -1;
  else a = parseInt(coefRaw, 10);

  const b = bRaw ? parseInt(bRaw, 10) : 0;

  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c)) {
    throw new Error("Non-integer coefficient detected (Phase 1A).");
  }

  if (a === 0) throw new Error("Not a valid linear equation (a cannot be 0).");

  return { a, b, c };
}
