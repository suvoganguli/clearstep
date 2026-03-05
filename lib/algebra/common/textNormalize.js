/**
 * Normalize algebra input so parsers receive predictable text.
 * This prevents the parser from needing to handle dozens of spacing variations.
 */

export function normalizeEquationText(input) {
  if (!input) return "";

  let t = String(input);

  // trim outer whitespace
  t = t.trim();

  // convert uppercase X to lowercase
  t = t.replace(/X/g, "x");

  // remove extra spaces around operators
  t = t.replace(/\s*\+\s*/g, " + ");
  t = t.replace(/\s*-\s*/g, " - ");
  t = t.replace(/\s*=\s*/g, " = ");

  // collapse multiple spaces
  t = t.replace(/\s+/g, " ");

  // remove trailing punctuation students sometimes type
  t = t.replace(/[?.!]+$/, "");

  return t.trim();
}
