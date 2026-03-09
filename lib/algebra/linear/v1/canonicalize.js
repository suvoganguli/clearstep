function parseSimpleExpression(expr) {
  const s = expr.replace(/\s+/g, "");

  const varMatch = s.match(/^([+-]?\d*)x([+-]\d+)?$/);
  if (varMatch) {
    let aRaw = varMatch[1];
    let bRaw = varMatch[2];

    let a;
    if (aRaw === "" || aRaw === "+") a = 1;
    else if (aRaw === "-") a = -1;
    else a = Number(aRaw);

    const b = bRaw ? Number(bRaw) : 0;

    return { a, b, valid: Number.isFinite(a) && Number.isFinite(b) };
  }

  const reverseVarMatch = s.match(/^([+-]?\d+)([+-]\d*)x$/);
  if (reverseVarMatch) {
    const first = Number(reverseVarMatch[1]);
    let secondRaw = reverseVarMatch[2];

    let second;
    if (secondRaw === "+" || secondRaw === "") second = 1;
    else if (secondRaw === "-") second = -1;
    else second = Number(secondRaw);

    return { a: second, b: first, valid: Number.isFinite(second) && Number.isFinite(first) };
  }

  const pureVar = s.match(/^([+-]?\d*)x$/);
  if (pureVar) {
    let aRaw = pureVar[1];
    let a;
    if (aRaw === "" || aRaw === "+") a = 1;
    else if (aRaw === "-") a = -1;
    else a = Number(aRaw);

    return { a, b: 0, valid: Number.isFinite(a) };
  }

  const pureNum = s.match(/^[+-]?\d+$/);
  if (pureNum) {
    return { a: 0, b: Number(s), valid: true };
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