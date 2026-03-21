import { normalizeEquationText } from "../../common/textNormalize.js";

// Integers and decimals (e.g. 0.5, 3., .25); fractions like 2/3 are Phase 2+.
const DEC = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;

function parseXCoeffPrefix(raw) {
  if (raw === "" || raw === "+") return 1;
  if (raw === "-") return -1;
  return parseFloat(raw);
}

function parseSideExpression(expr) {
  const s = expr.replace(/\s+/g, "");

  const varMatch = s.match(
    new RegExp(String.raw`^([+-]?(?:${DEC})?)x([+-]${DEC})?$`),
  );
  if (varMatch) {
    let aRaw = varMatch[1];
    let bRaw = varMatch[2];

    const xCoeff = parseXCoeffPrefix(aRaw);
    const constant = bRaw ? parseFloat(bRaw) : 0;

    return { xCoeff, constant };
  }

  const reverseVarMatch = s.match(
    new RegExp(String.raw`^([+-]?${DEC})([+-]?(?:${DEC})?)x$`),
  );
  if (reverseVarMatch) {
    const constant = parseFloat(reverseVarMatch[1]);
    const raw = reverseVarMatch[2];

    const xCoeff = parseXCoeffPrefix(raw);

    return { xCoeff, constant };
  }

  const pureVar = s.match(
    new RegExp(String.raw`^([+-]?(?:${DEC})?)x$`),
  );
  if (pureVar) {
    const raw = pureVar[1];
    const xCoeff = parseXCoeffPrefix(raw);

    return { xCoeff, constant: 0 };
  }

  const pureNum = s.match(new RegExp(String.raw`^[+-]?${DEC}$`));
  if (pureNum) {
    return { xCoeff: 0, constant: parseFloat(s) };
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

  if (!values.every((v) => Number.isFinite(v))) {
    throw new Error("Invalid coefficient (non-finite number).");
  }

  if (left.xCoeff === right.xCoeff) {
    throw new Error("Phase 1 supports equations with a unique linear solution only.");
  }

  return { left, right };
}