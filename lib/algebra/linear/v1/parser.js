import { normalizeEquationText } from "../../common/textNormalize.js";
import { detectOutOfScopeFractionInput } from "../../common/fractionInputGuard.js";

// Integers, decimals (0.5, 3., .25), and simple fractions (2/3).
const DEC = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;
const FRAC = String.raw`(?:\d+\/\d+)`;
const NUM = String.raw`(?:${DEC}|${FRAC})`;

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

function parseXCoeffPrefix(raw) {
  if (raw === "" || raw === "+") return 1;
  if (raw === "-") return -1;
  return parseNumberToken(raw);
}

function parseSideExpression(expr) {
  const s = expr.replace(/\s+/g, "");

  const varMatch = s.match(
    new RegExp(String.raw`^([+-]?(?:${NUM})?)x([+-]${NUM})?$`),
  );
  if (varMatch) {
    let aRaw = varMatch[1];
    let bRaw = varMatch[2];

    const xCoeff = parseXCoeffPrefix(aRaw);
    const constant = bRaw ? parseFloat(bRaw) : 0;

    return { xCoeff, constant };
  }

  const reverseVarMatch = s.match(
    new RegExp(String.raw`^([+-]?${NUM})([+-]?(?:${NUM})?)x$`),
  );
  if (reverseVarMatch) {
    const constant = parseNumberToken(reverseVarMatch[1]);
    const raw = reverseVarMatch[2];

    const xCoeff = parseXCoeffPrefix(raw);

    return { xCoeff, constant };
  }

  const varOverDenMatch = s.match(
    new RegExp(String.raw`^([+-]?)x\/(\d+)([+-]${NUM})?$`),
  );
  if (varOverDenMatch) {
    const sign = varOverDenMatch[1] === "-" ? -1 : 1;
    const den = parseFloat(varOverDenMatch[2]);
    const bRaw = varOverDenMatch[3];
    const xCoeff = sign / den;
    const constant = bRaw ? parseNumberToken(bRaw) : 0;
    return { xCoeff, constant };
  }

  const reverseVarOverDenMatch = s.match(
    new RegExp(String.raw`^([+-]?${NUM})([+-]?)x\/(\d+)$`),
  );
  if (reverseVarOverDenMatch) {
    const constant = parseNumberToken(reverseVarOverDenMatch[1]);
    const sign = reverseVarOverDenMatch[2] === "-" ? -1 : 1;
    const den = parseFloat(reverseVarOverDenMatch[3]);
    const xCoeff = sign / den;
    return { xCoeff, constant };
  }

  const pureVar = s.match(
    new RegExp(String.raw`^([+-]?(?:${NUM})?)x$`),
  );
  if (pureVar) {
    const raw = pureVar[1];
    const xCoeff = parseXCoeffPrefix(raw);

    return { xCoeff, constant: 0 };
  }

  const pureNum = s.match(new RegExp(String.raw`^[+-]?${NUM}$`));
  if (pureNum) {
    return { xCoeff: 0, constant: parseNumberToken(s) };
  }

  throw new Error("Unsupported side expression (Phase 1B).");
}

export function parseAxPlusBEqualsC(equationStr) {
  if (typeof equationStr !== "string") {
    throw new Error("Equation must be a string.");
  }

  const fractionIssue = detectOutOfScopeFractionInput(equationStr);
  if (fractionIssue) {
    const err = new Error(fractionIssue.message);
    err.code = fractionIssue.code;
    err.reason = fractionIssue.reason;
    throw err;
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

  if (!values.every((v) => Number.isFinite(v))) {
    throw new Error("Invalid coefficient (non-finite number).");
  }

  if (left.xCoeff === right.xCoeff) {
    throw new Error("Phase 1 supports equations with a unique linear solution only.");
  }

  return { left, right };
}