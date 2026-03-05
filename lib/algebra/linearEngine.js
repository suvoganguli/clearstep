// lib/algebra/linearEngine.js
// Deterministic solver + step checks for ax + b = c

export function solveLinear({ a, b, c }) {
  // a != 0 guaranteed by parser
  const num = c - b;
  return { a, b, c, num, x: num / a };
}

export function checkFinalAnswer(studentText, solved) {
  // Accept: "x=5", "x = 5", "5"
  const trimmed = (studentText || "").trim();

  let valStr = trimmed;

  const m = trimmed.match(/^x\s*=\s*(-?\d+(\.\d+)?)$/i);
  if (m) valStr = m[1];

  const xCandidate = Number(valStr);
  if (!Number.isFinite(xCandidate)) {
    return { ok: false, kind: "INVALID", message: "Please enter a number like 5 or x = 5." };
  }

  // Deterministic check via substitution: a*x + b === c
  const lhs = solved.a * xCandidate + solved.b;
  const rhs = solved.c;

  // Phase 1A uses integers; allow exact equality. (If decimals later, we’ll add tolerance.)
  if (lhs === rhs) return { ok: true, kind: "FINAL_CORRECT" };
  return { ok: false, kind: "FINAL_INCORRECT", message: "That value does not satisfy the original equation." };
}

export function normalizeStepInput(studentText) {
  const t = (studentText || "").trim();

  // If they typed x=...
  const xeq = t.match(/^x\s*=\s*(-?\d+(\.\d+)?)$/i);
  if (xeq) {
    return { kind: "X_EQUALS", x: Number(xeq[1]) };
  }

  // If they typed "3x=15" or "3x = 15" capture RHS (NOT x=5)
  const eq = t.match(/^(-?\d+)x\s*=\s*(-?\d+)$/i);
  if (eq) {
    const rhs = parseInt(eq[2], 10);
    return { kind: "EQUATION_FORM", rhs };
  }

  // If they typed just an integer like "15"
  if (/^-?\d+$/.test(t)) {
    return { kind: "NUMBER", rhs: parseInt(t, 10) };
  }

  return { kind: "UNKNOWN" };
}

export function checkNextStep(studentText, solved) {
  // For Phase 1A, the canonical step order is:
  // Step 1: subtract b from both sides -> a x = (c - b)  i.e. RHS = num
  // Step 2: divide by a -> x = num/a
  //
  // We will validate student inputs against these targets.

  const parsed = normalizeStepInput(studentText);

  if (parsed.kind === "X_EQUALS") {
    const finalVerdict = checkFinalAnswer(studentText, solved);
    return finalVerdict.ok
      ? { ok: true, kind: "FINAL_CORRECT" }
      : { ok: false, kind: "FINAL_INCORRECT", message: finalVerdict.message };
  }

if (parsed.kind === "NUMBER") {
  // First: treat the number as a possible final x and verify by substitution.
  const xCandidate = parsed.rhs;
  const lhs = solved.a * xCandidate + solved.b;

  if (lhs === solved.c) {
    return { ok: true, kind: "FINAL_CORRECT" };
  }

  // Otherwise: treat it as step 1 RHS attempt for ax = (c-b)
  const rhs = parsed.rhs;

  if (rhs === solved.num) {
    return { ok: true, kind: "STEP1_CORRECT", expectedNext: "DIVIDE_BY_A" };
  }

  return {
    ok: false,
    kind: "STEP1_INCORRECT",
    message: `Check your arithmetic: ${solved.c} - (${solved.b}) should equal ${solved.num}.`,
  };
}

if (parsed.kind === "EQUATION_FORM") {
  const rhs = parsed.rhs;

  if (rhs === solved.num) {
    return { ok: true, kind: "STEP1_CORRECT", expectedNext: "DIVIDE_BY_A" };
  }

  return {
    ok: false,
    kind: "STEP1_INCORRECT",
    message: `Check your arithmetic: ${solved.c} - (${solved.b}) should equal ${solved.num}.`,
  };
}

  // fallback: unknown input
  return {
    ok: false,
    kind: "UNKNOWN",
    message: "For now, please enter the next result (like 15) or the final answer (like x = 5).",
  };
}
