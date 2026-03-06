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

    let b = bRaw ? Number(bRaw) : 0;

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

    const a = second;
    const b = first;

    return { a, b, valid: Number.isFinite(a) && Number.isFinite(b) };
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

function formatCanonical(a, b, c) {
  let left;

  if (a === 1) left = "x";
  else if (a === -1) left = "-x";
  else left = `${a}x`;

  if (b > 0) left += ` + ${b}`;
  else if (b < 0) left += ` - ${Math.abs(b)}`;

  return `${left} = ${c}`;
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

  if (right.a === 0) {
    return formatCanonical(left.a, left.b, right.b);
  }

  if (left.a === 0) {
    return formatCanonical(right.a, right.b, left.b);
  }

  throw new Error("Unsupported linear equation form.");
}