// lib/algebra/linear/v1/engine.js

export function solveLinear(parsed) {
  const { left, right } = parsed;

  const a = left.xCoeff - right.xCoeff;
  const rhsAfterSubtract = right.constant - left.constant;

  if (!Number.isInteger(a) || !Number.isInteger(rhsAfterSubtract)) {
    throw new Error("Phase 1 supports integers only.");
  }

  if (a === 0) {
    throw new Error("Invalid equation: net x coefficient cannot be 0.");
  }

  if (rhsAfterSubtract % a !== 0) {
    throw new Error("Phase 1 supports integer solutions only.");
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
  return parseInt(raw, 10);
}

export function normalizeStepInput(studentText) {
  const t = (studentText || "").trim();

  let m = t.match(/^x\s*=\s*([+-]?\d+)\s*$/i);
  if (m) return { kind: "X_EQUALS", x: parseInt(m[1], 10) };

  m = t.match(/^([+-]?\d*)x\s*=\s*([+-]?\d+)\s*$/i);
  if (m) {
    return {
      kind: "AX_EQUALS",
      a: parseCoef(m[1]),
      rhs: parseInt(m[2], 10),
    };
  }

  if (/^[+-]?\d+$/.test(t)) {
    return { kind: "NUMBER", rhs: parseInt(t, 10) };
  }

  m = t.match(/\bdivide\s+by\s+([+-]?\d+)\b/i);
  if (m) return { kind: "OP_DIVIDE", n: parseInt(m[1], 10) };

  m = t.match(/\bsubtract\s+([+-]?\d+)\b/i);
  if (m) return { kind: "OP_SUBTRACT", n: parseInt(m[1], 10) };

  m = t.match(/\badd\s+([+-]?\d+)\b/i);
  if (m) return { kind: "OP_ADD", n: parseInt(m[1], 10) };

  m = t.match(/\bsubtract\s+([+-]?\d*)x\b/i);
  if (m) return { kind: "OP_SUBTRACT_X", n: parseCoef(m[1]) };

  m = t.match(/\badd\s+([+-]?\d*)x\b/i);
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
      return `x = ${solved.x}`;
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

export function checkNextStep(studentMessage, solved) {
  const parsed = normalizeStepInput(studentMessage);

  if (parsed.kind === "X_EQUALS") {
    if (parsed.x === solved.x) return { kind: "FINAL_CORRECT" };
    return { kind: "FINAL_INCORRECT", expected: solved.x };
  }

  // Accept correct intermediate equation after moving x terms
  const compact = studentMessage.replace(/\s+/g, "");

  const afterMoveX = buildAfterSubtractX(solved);
  if (compact === afterMoveX) {
    return {
      kind: "STEP_CORRECT",
      stage: "MOVE_X_TERMS_COMPLETE",
      next: "SUBTRACT_B",
    };
  }

  const afterSubtractConstant = buildAfterSubtractConstant(solved);
  if (compact === afterSubtractConstant) {
    return {
      kind: "STEP_CORRECT",
      stage: "SUBTRACT_CONSTANT_COMPLETE",
      next: "MOVE_X_TERMS",
    };
  }

  if (parsed.kind === "AX_EQUALS") {
    const okA = parsed.a === solved.a;
    const okRhs = parsed.rhs === solved.rhsAfterSubtract;

    if (okA && okRhs) {
      return {
        kind: "STEP_CORRECT",
        stage: "ISOLATED_AX",
        next: "DIVIDE_BY_A",
        a: solved.a,
      };
    }

    if (parsed.a === 1 && parsed.rhs === solved.x) {
      return { kind: "FINAL_CORRECT" };
    }

    return {
      kind: "STEP_INCORRECT",
      expected: `${solved.a === -1 ? "-x" : `${solved.a}x`} = ${solved.rhsAfterSubtract}`,
    };
  }

  if (parsed.kind === "NUMBER") {
    if (parsed.rhs === solved.x) {
      return { kind: "FINAL_CORRECT" };
    }

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

  if (parsed.kind === "OP_DIVIDE") {
    if (parsed.n === solved.a) {
      return { kind: "STEP_HINT", stage: "DIVIDE_BY_A", a: solved.a };
    }
    return { kind: "STEP_HINT", stage: "DIVIDE_BY_WHAT", a: solved.a };
  }

  if (parsed.kind === "OP_SUBTRACT") {
    if (parsed.n === solved.leftConstant) {
      return { kind: "STEP_HINT", stage: "SUBTRACT_B", b: solved.leftConstant };
    }

    return {
      kind: "STEP_INCORRECT",
      expected: `subtract ${solved.leftConstant}`,
    };
  }

  if (parsed.kind === "OP_ADD") {
    if (parsed.n === Math.abs(solved.leftConstant)) {
      return { kind: "STEP_HINT", stage: "SUBTRACT_B", b: solved.leftConstant };
    }

    return {
      kind: "STEP_INCORRECT",
      expected: `subtract ${solved.leftConstant}`,
    };
  }

  if (parsed.kind === "OP_SUBTRACT_X") {
    if (parsed.n === solved.rightXCoeff) {
      return {
        kind: "STEP_HINT",
        stage: "MOVE_X_TERMS",
        n: solved.rightXCoeff,
      };
    }
    return { kind: "STEP_HINT", stage: "MOVE_X_TERMS", n: solved.rightXCoeff };
  }

  if (parsed.kind === "OP_ADD_X") {
    if (parsed.n === Math.abs(solved.rightXCoeff)) {
      return {
        kind: "STEP_HINT",
        stage: "MOVE_X_TERMS",
        n: solved.rightXCoeff,
      };
    }
    return { kind: "STEP_HINT", stage: "MOVE_X_TERMS", n: solved.rightXCoeff };
  }

  return { kind: "UNKNOWN" };
}
