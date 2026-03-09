import { normalizeEquationText } from "../../common/textNormalize.js";

function parseSideExpression(expr) {
  const s = expr.replace(/\s+/g, "");

  const varMatch = s.match(/^([+-]?\d*)x([+-]\d+)?$/);
  if (varMatch) {
    let aRaw = varMatch[1];
    let bRaw = varMatch[2];

    let xCoeff;
    if (aRaw === "" || aRaw === "+") xCoeff = 1;
    else if (aRaw === "-") xCoeff = -1;
    else xCoeff = parseInt(aRaw, 10);

    const constant = bRaw ? parseInt(bRaw, 10) : 0;

    return { xCoeff, constant };
  }

  const reverseVarMatch = s.match(/^([+-]?\d+)([+-]\d*)x$/);
  if (reverseVarMatch) {
    const constant = parseInt(reverseVarMatch[1], 10);
    const raw = reverseVarMatch[2];

    let xCoeff;
    if (raw === "" || raw === "+") xCoeff = 1;
    else if (raw === "-") xCoeff = -1;
    else xCoeff = parseInt(raw, 10);

    return { xCoeff, constant };
  }

  const pureVar = s.match(/^([+-]?\d*)x$/);
  if (pureVar) {
    const raw = pureVar[1];

    let xCoeff;
    if (raw === "" || raw === "+") xCoeff = 1;
    else if (raw === "-") xCoeff = -1;
    else xCoeff = parseInt(raw, 10);

    return { xCoeff, constant: 0 };
  }

  const pureNum = s.match(/^[+-]?\d+$/);
  if (pureNum) {
    return { xCoeff: 0, constant: parseInt(s, 10) };
  }

  throw new Error("Unsupported side expression (Phase 1B).");
}

export function parseAxPlusBEqualsC(equationStr) {
  if (typeof equationStr !== "string") {
    throw new Error("Equation must be a string.");
  }

  const equation = normalizeEquationText(equationStr);
  const clean = equation.replace(/\s+/g, "");
  const parts = clean.split("=");

  if (parts.length !== 2) {
    throw new Error("Equation must contain exactly one '='.");
  }

  const left = parseSideExpression(parts[0]);
  const right = parseSideExpression(parts[1]);

  const values = [
    left.xCoeff,
    left.constant,
    right.xCoeff,
    right.constant,
  ];

  if (!values.every(Number.isInteger)) {
    throw new Error("Non-integer coefficient detected (Phase 1B).");
  }

  if (left.xCoeff === right.xCoeff) {
    throw new Error("Phase 1 supports equations with a unique linear solution only.");
  }

  return { left, right };
}