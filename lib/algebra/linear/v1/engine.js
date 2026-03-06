// lib/algebra/linear/v1/engine.js

// Solve ax + b = c (Phase 1: integers; allow negative a/b/c)
export function solveLinear(parsed) {
  const { a, b, c } = parsed;

  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c)) {
    throw new Error("Phase 1 supports integers only.");
  }
  if (a === 0) throw new Error("Invalid equation: a cannot be 0.");

  const rhsAfterSubtract = c - b; // ax = c - b

  // For Phase 1, require x to be integer
  if (rhsAfterSubtract % a !== 0) {
    throw new Error("Phase 1 supports integer solutions only.");
  }

  const x = rhsAfterSubtract / a;

  return { a, b, c, rhsAfterSubtract, x };
}

function parseCoef(raw) {
  // raw can be "", "+", "-", "3", "-2"
  if (raw === "" || raw === "+") return 1;
  if (raw === "-") return -1;
  return parseInt(raw, 10);
}

// Normalize student input into structured intent
export function normalizeStepInput(studentText) {
  const t = (studentText || "").trim();

  // x = number  (final)
  let m = t.match(/^x\s*=\s*([+-]?\d+)\s*$/i);
  if (m) return { kind: "X_EQUALS", x: parseInt(m[1], 10) };

  // ax = number  (including -x = 15)
  m = t.match(/^([+-]?\d*)x\s*=\s*([+-]?\d+)\s*$/i);
  if (m) {
    return {
      kind: "AX_EQUALS",
      a: parseCoef(m[1]),
      rhs: parseInt(m[2], 10),
    };
  }

  // plain integer like "15"
  if (/^[+-]?\d+$/.test(t)) {
    return { kind: "NUMBER", rhs: parseInt(t, 10) };
  }

  // optional: detect "divide by -1" / "subtract 5" style
  m = t.match(/\bdivide\s+by\s+([+-]?\d+)\b/i);
  if (m) return { kind: "OP_DIVIDE", n: parseInt(m[1], 10) };

  m = t.match(/\bsubtract\s+([+-]?\d+)\b/i);
  if (m) return { kind: "OP_SUBTRACT", n: parseInt(m[1], 10) };

  return { kind: "UNKNOWN" };
}

/**
 * Check whether the student's message matches:
 * 1) intermediate step: ax = c - b  (e.g., -x = 15)
 * 2) arithmetic result only: (c - b) (e.g., 15)
 * 3) final answer: x = (c - b)/a  (e.g., x = -15)
 */
export function checkNextStep(studentMessage, solved) {
  const parsed = normalizeStepInput(studentMessage);

  // Final answer path
  if (parsed.kind === "X_EQUALS") {
    if (parsed.x === solved.x) return { kind: "FINAL_CORRECT" };
    return { kind: "FINAL_INCORRECT", expected: solved.x };
  }

  // Intermediate equation path: ax = rhsAfterSubtract
  if (parsed.kind === "AX_EQUALS") {
    const okA = parsed.a === solved.a; // handles a = -1 vs -x
    const okRhs = parsed.rhs === solved.rhsAfterSubtract;

    if (okA && okRhs) {
      return {
        kind: "STEP_CORRECT",
        stage: "ISOLATED_AX",
        next: "DIVIDE_BY_A",
        a: solved.a,
      };
    }

    // If they wrote a correct final step in ax-form like 1x = -15, treat as final
    if (parsed.a === 1 && parsed.rhs === solved.x) return { kind: "FINAL_CORRECT" };

    return {
      kind: "STEP_INCORRECT",
      expected: `${solved.a === -1 ? "-x" : `${solved.a}x`} = ${solved.rhsAfterSubtract}`,
    };
  }

  // Arithmetic-only path: "15"
  if (parsed.kind === "NUMBER") {
    // First: if the student typed the final value of x directly, accept it.
    if (parsed.rhs === solved.x) {
      return { kind: "FINAL_CORRECT" };
    }

    // Otherwise, it may be the intermediate arithmetic result after subtracting b.
    if (parsed.rhs === solved.rhsAfterSubtract) {
      return {
        kind: "STEP_CORRECT",
        stage: "ARITHMETIC_OK",
        next: "WRITE_AX_EQUALS",
        expected: `${solved.a === -1 ? "-x" : `${solved.a}x`} = ${solved.rhsAfterSubtract}`,
      };
    }

    return {
      kind: "STEP_INCORRECT",
      expected: solved.rhsAfterSubtract,
    };
  }

  // If they typed "divide by -1" etc, acknowledge but still keep it coaching
  if (parsed.kind === "OP_DIVIDE") {
    if (parsed.n === solved.a) {
      return { kind: "STEP_HINT", stage: "DIVIDE_BY_A", a: solved.a };
    }
    return { kind: "STEP_HINT", stage: "DIVIDE_BY_WHAT", a: solved.a };
  }

  if (parsed.kind === "OP_SUBTRACT") {
    // they might say "subtract 5" etc; just treat as intent
    return { kind: "STEP_HINT", stage: "SUBTRACT_B", b: solved.b };
  }

  return { kind: "UNKNOWN" };
}