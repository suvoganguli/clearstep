export function classifyStudentIntent(input) {
  const raw = String(input || "").trim();
  const text = raw.toLowerCase().trim();

  if (!text) {
    return {
      kind: "unknown",
      extractedStep: null,
      normalizedText: "",
    };
  }

  const normalizedText = text
    .replace(/\?/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

  const explanationPatterns = [/^why\b/, /\bexplain\b/, /\bhow come\b/];

  for (const pattern of explanationPatterns) {
    if (pattern.test(normalizedText)) {
      return {
        kind: "explanation_request",
        extractedStep: extractEmbeddedStep(normalizedText),
        normalizedText,
      };
    }
  }

  const helpPatterns = [
    /^help\b/,
    /^next\b/,
    /\bnot sure\b/,
    /\bwhat now\b/,
    /\bwhat do i do\b/,
    /\bstuck\b/,
    /\bhint\b/,
  ];

  for (const pattern of helpPatterns) {
    if (pattern.test(normalizedText)) {
      return {
        kind: "help_request",
        extractedStep: null,
        normalizedText,
      };
    }
  }

  const tentativePatterns = [
    /\bmaybe\b/,
    /\bi think\b/,
    /\bshould i\b/,
    /\bdo we\b/,
    /\bdo you\b/,
    /\bcan you\b/,
    /\bperhaps\b/,
    /\bwe need to\b/,
    /\bis that true\b/,
  ];

  const extractedStep = extractEmbeddedStep(normalizedText);

  if (extractedStep === "__MULTI_STEP__") {
    return {
      kind: "multi_step",
      extractedStep: null,
      normalizedText,
    };
  }


  if (extractedStep) {
    for (const pattern of tentativePatterns) {
      if (pattern.test(normalizedText)) {
        return {
          kind: "tentative_step",
          extractedStep,
          normalizedText,
        };
      }
    }

    return {
      kind: "direct_step",
      extractedStep,
      normalizedText,
    };
  }

  return {
    kind: "unknown",
    extractedStep: null,
    normalizedText,
  };
}

function extractEmbeddedStep(text) {
  const s = text.trim();

  // Detect multi-step answers like "subtract 5 then divide by 3"
  const lower = s.toLowerCase();

  if (
    /\band then\b/.test(lower) ||
    /\bthen\b/.test(lower) ||
    /\bso x\s*=\s*/.test(lower) ||
    /\btherefore\b/.test(lower)
  ) {
    return "__MULTI_STEP__";
  }

  if (!s) return null;

  if (/^[+-]?\d+$/.test(s)) {
    return s;
  }

  if (/^[+-]?\d*x\s*=\s*[+-]?\d+$/.test(s)) {
    return s.replace(/\s+/g, "");
  }

  if (/^x\s*=\s*[+-]?\d+$/.test(s)) {
    return s.replace(/\s+/g, "");
  }

  const subtractMatch =
    s.match(/\bsubtract(?:\s+each\s+side)?(?:\s+by)?\s+([+-]?\d+)\b/) ||
    s.match(/\bminus\s+([+-]?\d+)\b/);

  if (subtractMatch) {
    return `subtract ${subtractMatch[1]}`;
  }

  const addMatch = s.match(/\badd\s+([+-]?\d+)\b/);
  if (addMatch) {
    return `add ${addMatch[1]}`;
  }

  const divideMatch = s.match(/\bdivide(?:\s+by)?\s+([+-]?\d+)\b/);
  if (divideMatch) {
    return `divide by ${divideMatch[1]}`;
  }

  const multiplyMatch = s.match(/\bmultiply(?:\s+by)?\s+([+-]?\d+)\b/);
  if (multiplyMatch) {
    return `multiply by ${multiplyMatch[1]}`;
  }

  const minusMatch = s.match(/\bminus\s+([+-]?\d+)\b/);
  if (minusMatch) {
    return `subtract ${minusMatch[1]}`;
  }

  return null;
}
