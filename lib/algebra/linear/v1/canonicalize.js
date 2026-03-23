import { detectOutOfScopeFractionInput } from "../../common/fractionInputGuard.js";

const DEC = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;
const FRAC = String.raw`(?:\d+\/\d+)`;
const NUM = String.raw`(?:${DEC}|${FRAC})`;

function parseNumberToken(raw) {
  if (typeof raw !== "string" || !raw) return NaN;
  if (raw.includes("/")) {
    const [numRaw, denRaw] = raw.split("/");
    const num = Number(numRaw);
    const den = Number(denRaw);
    return den === 0 ? NaN : num / den;
  }
  return Number(raw);
}

function parseSimpleExpression(expr) {
  const s = expr.replace(/\s+/g, "");

  const varMatch = s.match(
    new RegExp(String.raw`^([+-]?(?:${NUM})?)x([+-]${NUM})?$`),
  );
  if (varMatch) {
    let aRaw = varMatch[1];
    let bRaw = varMatch[2];

    let a;
    if (aRaw === "" || aRaw === "+") a = 1;
    else if (aRaw === "-") a = -1;
    else a = parseNumberToken(aRaw);

    const b = bRaw ? parseNumberToken(bRaw) : 0;

    return { a, b, valid: Number.isFinite(a) && Number.isFinite(b) };
  }

  const reverseVarMatch = s.match(
    new RegExp(String.raw`^([+-]?${NUM})([+-]?(?:${NUM})?)x$`),
  );
  if (reverseVarMatch) {
    const first = parseNumberToken(reverseVarMatch[1]);
    let secondRaw = reverseVarMatch[2];

    let second;
    if (secondRaw === "+" || secondRaw === "") second = 1;
    else if (secondRaw === "-") second = -1;
    else second = parseNumberToken(secondRaw);

    return { a: second, b: first, valid: Number.isFinite(second) && Number.isFinite(first) };
  }

  const varOverDenMatch = s.match(
    new RegExp(String.raw`^([+-]?)x\/(\d+)([+-]${NUM})?$`),
  );
  if (varOverDenMatch) {
    const sign = varOverDenMatch[1] === "-" ? -1 : 1;
    const den = Number(varOverDenMatch[2]);
    const bRaw = varOverDenMatch[3];
    const a = sign / den;
    const b = bRaw ? parseNumberToken(bRaw) : 0;
    return { a, b, valid: Number.isFinite(a) && Number.isFinite(b) };
  }

  const reverseVarOverDenMatch = s.match(
    new RegExp(String.raw`^([+-]?${NUM})([+-]?)x\/(\d+)$`),
  );
  if (reverseVarOverDenMatch) {
    const b = parseNumberToken(reverseVarOverDenMatch[1]);
    const sign = reverseVarOverDenMatch[2] === "-" ? -1 : 1;
    const den = Number(reverseVarOverDenMatch[3]);
    const a = sign / den;
    return { a, b, valid: Number.isFinite(a) && Number.isFinite(b) };
  }

  const pureVar = s.match(
    new RegExp(String.raw`^([+-]?(?:${NUM})?)x$`),
  );
  if (pureVar) {
    let aRaw = pureVar[1];
    let a;
    if (aRaw === "" || aRaw === "+") a = 1;
    else if (aRaw === "-") a = -1;
    else a = parseNumberToken(aRaw);

    return { a, b: 0, valid: Number.isFinite(a) };
  }

  const pureNum = s.match(new RegExp(String.raw`^[+-]?${NUM}$`));
  if (pureNum) {
    return { a: 0, b: parseNumberToken(s), valid: true };
  }

  return null;
}

function formatExpression(a, b) {
  if (a === 0) return `${b}`;

  let out;
  if (a === 1) out = "x";
  else if (a === -1) out = "-x";
  else out = `${a}x`;

  if (b > 0) out += ` + ${b}`;
  else if (b < 0) out += ` - ${Math.abs(b)}`;

  return out;
}

export function canonicalizeLinearEquation(input) {
  const fractionIssue = detectOutOfScopeFractionInput(input);
  if (fractionIssue) {
    const err = new Error(fractionIssue.message);
    err.code = fractionIssue.code;
    err.reason = fractionIssue.reason;
    throw err;
  }

  const parts = input.split("=");
  if (parts.length !== 2) {
    throw new Error("Equation must contain exactly one = sign.");
  }

  const left = parseSimpleExpression(parts[0]);
  const right = parseSimpleExpression(parts[1]);

  if (!left || !right || !left.valid || !right.valid) {
    throw new Error("Unsupported linear equation form.");
  }

  return `${formatExpression(left.a, left.b)} = ${formatExpression(right.a, right.b)}`;
}