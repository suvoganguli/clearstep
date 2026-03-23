export const OUT_OF_SCOPE_FRACTION_MESSAGE =
  "I can handle decimals and simple fractions like 1/3, but not mixed fractions like 1 1/2 yet. Please rewrite it as an improper fraction (for example, 3/2) or a decimal.";

function normalizeText(input) {
  return String(input || "")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectOutOfScopeFractionInput(input) {
  const text = normalizeText(input);
  if (!text) return null;

  // Mixed fraction: e.g. "1 1/2", "-2 3/4".
  if (/\b[+-]?\d+\s+\d+\/\d+(?=[^\d/]|$)/.test(text)) {
    return {
      code: "OUT_OF_SCOPE_FRACTION",
      reason: "mixed_fraction",
      message: OUT_OF_SCOPE_FRACTION_MESSAGE,
    };
  }

  // Zero denominator: e.g. "2/0", "-3/00".
  if (/\b[+-]?\d+\/0+\b/.test(text)) {
    return {
      code: "OUT_OF_SCOPE_FRACTION",
      reason: "zero_denominator",
      message: OUT_OF_SCOPE_FRACTION_MESSAGE,
    };
  }

  // Malformed: missing numerator ("/2") or denominator ("2/").
  if (/(^|[=\s+\-*/(])\/\d+(\b|$)/.test(text) || /\b\d+\/($|[=\s+\-*/)])/i.test(text)) {
    return {
      code: "OUT_OF_SCOPE_FRACTION",
      reason: "malformed_fraction",
      message: OUT_OF_SCOPE_FRACTION_MESSAGE,
    };
  }

  return null;
}
