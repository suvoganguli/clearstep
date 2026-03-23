// lib/algebra/linear/v1/engine.js

import { canonicalizeLinearEquation } from "./canonicalize.js";
import { detectOutOfScopeFractionInput } from "../../common/fractionInputGuard.js";

// Match parser/canonicalize: integers, decimals, and simple fractions like 2/3.
const DEC = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;
const FRAC = String.raw`(?:\d+\/\d+)`;
const NUM = String.raw`(?:${DEC}|${FRAC})`;

const NUM_EPS_ABS = 1e-9;
const NUM_EPS_REL = 1e-12;

/** Tolerant equality for parsed floats vs solver values (keeps integer cases exact). */
function approxEqual(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (Object.is(a, b)) return true;
  const diff = Math.abs(a - b);
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return diff <= NUM_EPS_ABS || diff <= NUM_EPS_REL * scale;
}

function approxZero(n) {
  return !Number.isFinite(n) ? false : approxEqual(n, 0);
}

/** Max distance to snap to nearest integer in hint / expected text only (float display noise). */
const HINT_INT_SNAP = 1e-7;

/**
 * Human-readable number for tutor strings only — does not affect approxEqual / validation.
 * Snaps 0.999999999 → "1"; trims long float tails on decimals.
 */
function formatNumberForHint(n) {
  if (!Number.isFinite(n)) return String(n);
  const r = Math.round(n);
  if (Math.abs(n - r) <= HINT_INT_SNAP) {
    return String(r);
  }
  return String(parseFloat(n.toPrecision(12)));
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

/**
 * For divide-related hints, prefer simple fractions over long floats when the
 * number is very close to a small rational (e.g. 0.666666666666 -> 2/3).
 */
function formatCoefficientForHint(n) {
  if (!Number.isFinite(n)) return String(n);
  if (isIntegerLike(n)) return String(Math.round(n));

  const maxDen = 12;
  const tol = 1e-9;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);

  let best = null;
  for (let den = 2; den <= maxDen; den++) {
    const num = Math.round(abs * den);
    const approx = num / den;
    if (Math.abs(approx - abs) <= tol) {
      const g = gcd(num, den);
      best = {
        num: sign * (num / g),
        den: den / g,
      };
      break;
    }
  }

  if (best) {
    return `${best.num}/${best.den}`;
  }
  return formatNumberForHint(n);
}

/** True when trueX is an integer (or float noise around one); final answers must match exactly. */
function isIntegerLike(n) {
  return Number.isFinite(n) && Math.abs(n - Math.round(n)) < 1e-9;
}

/**
 * Final x validation: integer solutions use tight approxEqual; non-integers allow ±0.01 absolute
 * (hundredths band — accepts common roundings like 0.33 for 1/3, rejects 0.3).
 */
const FINAL_DECIMAL_ABS_TOL = 0.01;

function finalXMatches(submitted, trueX) {
  if (!Number.isFinite(submitted) || !Number.isFinite(trueX)) return false;
  if (isIntegerLike(trueX)) {
    return approxEqual(submitted, trueX);
  }
  return Math.abs(submitted - trueX) <= FINAL_DECIMAL_ABS_TOL;
}

export function solveLinear(parsed) {
  const { left, right } = parsed;

  const a = left.xCoeff - right.xCoeff;
  const rhsAfterSubtract = right.constant - left.constant;

  if (!Number.isFinite(a) || !Number.isFinite(rhsAfterSubtract)) {
    throw new Error("Phase 1 supports finite numbers only.");
  }

  if (a === 0) {
    throw new Error("Invalid equation: net x coefficient cannot be 0.");
  }

  const x = rhsAfterSubtract / a;

  return {
    left,
    right,
    a,
    b: left.constant,
    c: right.constant,
    rhsAfterSubtract,
    x,
    rightXCoeff: right.xCoeff,
    leftConstant: left.constant,
  };
}

function parseCoef(raw) {
  if (raw === "" || raw === "+") return 1;
  if (raw === "-") return -1;
  return parseNumberToken(raw);
}

function parseNumberToken(raw) {
  if (typeof raw !== "string" || !raw) return NaN;
  if (raw.includes("/")) {
    const [numRaw, denRaw] = raw.split("/");
    const num = parseFloat(numRaw);
    const den = parseFloat(denRaw);
    return den === 0 ? NaN : num / den;
  }
  return parseFloat(raw);
}

export function normalizeStepInput(studentText) {
  const t = replaceSmallNumberWords((studentText || "").trim());
  const fractionIssue = detectOutOfScopeFractionInput(t);
  if (fractionIssue) {
    return {
      kind: "UNSUPPORTED_FRACTION_FORMAT",
      code: fractionIssue.code,
      reason: fractionIssue.reason,
      message: fractionIssue.message,
    };
  }

  let m = t.match(
    new RegExp(String.raw`^(?:is\s+)?x\s*=\s*([+-]?(?:${NUM}))\s*\??$`, "i"),
  );
  if (m) return { kind: "X_EQUALS", x: parseNumberToken(m[1]) };

  m = t.match(
    new RegExp(
      String.raw`^(?:is\s+)?([+-]?(?:${NUM})?)x\s*=\s*([+-]?(?:${NUM}))\s*\??$`,
      "i",
    ),
  );
  if (m) {
    return {
      kind: "AX_EQUALS",
      a: parseCoef(m[1]),
      rhs: parseNumberToken(m[2]),
    };
  }

  if (new RegExp(String.raw`^[+-]?(?:${NUM})$`).test(t)) {
    return { kind: "NUMBER", rhs: parseNumberToken(t) };
  }

  m = t.match(
    new RegExp(String.raw`\bdivide\s+by\s+([+-]?(?:${NUM}))(?!\S)`, "i"),
  );
  if (m) return { kind: "OP_DIVIDE", n: parseNumberToken(m[1]) };

  m = t.match(
    new RegExp(String.raw`\bsubtract\s+([+-]?(?:${NUM}))(?!\S)`, "i"),
  );
  if (m) return { kind: "OP_SUBTRACT", n: parseNumberToken(m[1]) };

  m = t.match(new RegExp(String.raw`\badd\s+([+-]?(?:${NUM}))(?!\S)`, "i"));
  if (m) return { kind: "OP_ADD", n: parseNumberToken(m[1]) };

  m = t.match(
    new RegExp(String.raw`\bmultiply\s+by\s+([+-]?(?:${NUM}))(?!\S)`, "i"),
  );
  if (m) return { kind: "OP_MULTIPLY", n: parseNumberToken(m[1]) };

  m = t.match(
    new RegExp(String.raw`\bsubtract\s+([+-]?(?:${NUM})?)x\b`, "i"),
  );
  if (m) return { kind: "OP_SUBTRACT_X", n: parseCoef(m[1]) };

  m = t.match(new RegExp(String.raw`\badd\s+([+-]?(?:${NUM})?)x\b`, "i"));
  if (m) return { kind: "OP_ADD_X", n: parseCoef(m[1]) };

  return { kind: "UNKNOWN" };
}

function formatSide(xCoeff, constant) {
  if (xCoeff === 0) return `${constant}`;

  let out;
  if (xCoeff === 1) out = "x";
  else if (xCoeff === -1) out = "-x";
  else out = `${xCoeff}x`;

  if (constant > 0) out += `+${constant}`;
  else if (constant < 0) out += `-${Math.abs(constant)}`;

  return out;
}

function buildAfterSubtractX(solved) {
  return `${formatSide(
    solved.left.xCoeff - solved.rightXCoeff,
    solved.left.constant,
  )}=${formatSide(0, solved.c)}`;
}

function buildAfterSubtractConstant(solved) {
  return `${formatSide(solved.left.xCoeff, 0)}=${formatSide(
    solved.rightXCoeff,
    solved.c - solved.leftConstant,
  )}`;
}

export function deriveNextEquationFromMathResult(solved, mathResult) {
  if (!mathResult) return null;

  if (mathResult.kind === "FINAL_CORRECT") {
    return `x = ${solved.x}`;
  }

  if (mathResult.kind === "STEP_HINT") {
    if (mathResult.stage === "SUBTRACT_B") {
      return buildAfterSubtractConstant(solved);
    }

    if (mathResult.stage === "MOVE_X_TERMS") {
      return buildAfterSubtractX(solved);
    }

    if (mathResult.stage === "DIVIDE_BY_A") {
      // Do not advance to "x = …" here: that line re-parses as coefficient 1 and
      // breaks the next turn's step check (e.g. "divide by 3" on 3x = 1).
      return null;
    }
  }

  if (mathResult.kind === "STEP_CORRECT") {
    if (mathResult.stage === "SUBTRACT_CONSTANT_COMPLETE") {
      return buildAfterSubtractConstant(solved);
    }

    if (mathResult.stage === "MOVE_X_TERMS_COMPLETE") {
      return buildAfterSubtractX(solved);
    }

    if (mathResult.stage === "ISOLATED_AX") {
      return `${solved.a === -1 ? "-x" : `${solved.a}x`} = ${solved.rhsAfterSubtract}`;
    }

    if (mathResult.stage === "ARITHMETIC_OK") {
      return `${solved.a === -1 ? "-x" : `${solved.a}x`} = ${solved.rhsAfterSubtract}`;
    }
  }

  return null;
}

function canonicalizeEquationOrNull(text) {
  try {
    return canonicalizeLinearEquation(text).replace(/\s+/g, "");
  } catch {
    return null;
  }
}

function replaceSmallNumberWords(text) {
  return text
    .replace(/\bzero\b/gi, "0")
    .replace(/\bone\b/gi, "1")
    .replace(/\btwo\b/gi, "2")
    .replace(/\bthree\b/gi, "3")
    .replace(/\bfour\b/gi, "4")
    .replace(/\bfive\b/gi, "5")
    .replace(/\bsix\b/gi, "6")
    .replace(/\bseven\b/gi, "7")
    .replace(/\beight\b/gi, "8")
    .replace(/\bnine\b/gi, "9")
    .replace(/\bten\b/gi, "10");
}

export function checkNextStep(studentMessage, solved) {
  const parsed = normalizeStepInput(studentMessage);

  if (parsed.kind === "UNSUPPORTED_FRACTION_FORMAT") {
    return parsed;
  }

  if (parsed.kind === "X_EQUALS") {
    if (finalXMatches(parsed.x, solved.x)) return { kind: "FINAL_CORRECT" };
    return {
      kind: "FINAL_INCORRECT",
      expected: formatNumberForHint(solved.x),
    };
  }

  // Accept correct intermediate equation after moving x terms
  const studentCanonical = canonicalizeEquationOrNull(studentMessage);

  const afterMoveXCanonical = canonicalizeEquationOrNull(
    buildAfterSubtractX(solved),
  );
  if (studentCanonical && studentCanonical === afterMoveXCanonical) {
    return {
      kind: "STEP_CORRECT",
      stage: "MOVE_X_TERMS_COMPLETE",
      next: "SUBTRACT_B",
    };
  }

  const afterSubtractConstantCanonical = canonicalizeEquationOrNull(
    buildAfterSubtractConstant(solved),
  );
  if (studentCanonical && studentCanonical === afterSubtractConstantCanonical) {
    return {
      kind: "STEP_CORRECT",
      stage: "SUBTRACT_CONSTANT_COMPLETE",
      next: "MOVE_X_TERMS",
    };
  }

  if (parsed.kind === "AX_EQUALS") {
    const okA = approxEqual(parsed.a, solved.a);
    const okRhs = approxEqual(parsed.rhs, solved.rhsAfterSubtract);

    if (okA && okRhs) {
      return {
        kind: "STEP_CORRECT",
        stage: "ISOLATED_AX",
        next: "DIVIDE_BY_A",
        a: solved.a,
      };
    }

    if (approxEqual(parsed.a, 1) && finalXMatches(parsed.rhs, solved.x)) {
      return { kind: "FINAL_CORRECT" };
    }

    const axStr = approxEqual(solved.a, -1)
      ? "-x"
      : `${formatNumberForHint(solved.a)}x`;
    return {
      kind: "STEP_INCORRECT",
      expected: `${axStr} = ${formatNumberForHint(solved.rhsAfterSubtract)}`,
    };
  }

  if (parsed.kind === "NUMBER") {
    if (finalXMatches(parsed.rhs, solved.x)) {
      return { kind: "FINAL_CORRECT" };
    }

    if (approxEqual(parsed.rhs, solved.rhsAfterSubtract)) {
      const axStr = approxEqual(solved.a, -1)
        ? "-x"
        : `${formatNumberForHint(solved.a)}x`;
      return {
        kind: "STEP_CORRECT",
        stage: "ARITHMETIC_OK",
        next: "WRITE_AX_EQUALS",
        expected: `${axStr} = ${formatNumberForHint(solved.rhsAfterSubtract)}`,
      };
    }

    return {
      kind: "STEP_INCORRECT",
      expected: formatNumberForHint(solved.rhsAfterSubtract),
    };
  }

  if (parsed.kind === "OP_DIVIDE") {
    // If constant still exists on left → cannot divide yet
    if (!approxZero(solved.leftConstant)) {
      return {
        kind: "STEP_INCORRECT",
        expected: `subtract ${formatNumberForHint(solved.leftConstant)}`,
      };
    }

    // Now division is valid
    if (approxEqual(parsed.n, solved.a)) {
      return { kind: "STEP_HINT", stage: "DIVIDE_BY_A", a: solved.a };
    }

    return {
      kind: "STEP_INCORRECT",
      expected: `divide by ${formatCoefficientForHint(solved.a)}`,
    };
  }

  if (parsed.kind === "OP_SUBTRACT") {
    if (approxEqual(parsed.n, solved.leftConstant)) {
      return { kind: "STEP_HINT", stage: "SUBTRACT_B", b: solved.leftConstant };
    }

    return {
      kind: "STEP_INCORRECT",
      expected: `subtract ${formatNumberForHint(solved.leftConstant)}`,
    };
  }

  if (parsed.kind === "OP_ADD") {
    if (approxEqual(parsed.n, Math.abs(solved.leftConstant))) {
      return { kind: "STEP_HINT", stage: "SUBTRACT_B", b: solved.leftConstant };
    }

    return {
      kind: "STEP_INCORRECT",
      expected: `subtract ${formatNumberForHint(solved.leftConstant)}`,
    };
  }

  if (parsed.kind === "OP_MULTIPLY") {
    // Minimal equivalence support: x/2 = rhs can be solved by multiplying by 2,
    // which is equivalent to dividing by 1/2.
    if (!approxZero(solved.leftConstant)) {
      return {
        kind: "STEP_INCORRECT",
        expected: `subtract ${formatNumberForHint(solved.leftConstant)}`,
      };
    }

    if (approxEqual(parsed.n * solved.a, 1)) {
      return { kind: "STEP_HINT", stage: "DIVIDE_BY_A", a: solved.a };
    }

    return {
      kind: "STEP_INCORRECT",
      expected: `divide by ${formatCoefficientForHint(solved.a)}`,
    };
  }

  if (parsed.kind === "OP_SUBTRACT_X") {
    if (approxEqual(parsed.n, solved.rightXCoeff)) {
      return {
        kind: "STEP_HINT",
        stage: "MOVE_X_TERMS",
        n: solved.rightXCoeff,
      };
    }

    const xTerm = approxEqual(solved.rightXCoeff, 1)
      ? "x"
      : `${formatNumberForHint(solved.rightXCoeff)}x`;
    return {
      kind: "STEP_INCORRECT",
      expected: `subtract ${xTerm}`,
    };
  }

  if (parsed.kind === "OP_ADD_X") {
    if (
      solved.rightXCoeff < 0 &&
      approxEqual(parsed.n, Math.abs(solved.rightXCoeff))
    ) {
      return {
        kind: "STEP_HINT",
        stage: "MOVE_X_TERMS",
        n: solved.rightXCoeff,
      };
    }

    const xTerm = approxEqual(solved.rightXCoeff, 1)
      ? "x"
      : `${formatNumberForHint(solved.rightXCoeff)}x`;
    return {
      kind: "STEP_INCORRECT",
      expected: `subtract ${xTerm}`,
    };
  }

  return { kind: "UNKNOWN" };
}
