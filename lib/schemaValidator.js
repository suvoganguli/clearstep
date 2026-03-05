const ALLOWED_TYPES = new Set(["QUESTION", "HINT", "FEEDBACK", "REFUSAL"]);

function looksLikeFinalAnswerLeak(text) {
  if (!text) return false;

  const patterns = [
    /\bthe answer is\b/i,
    /\bfinal answer\b/i,
    /\bsolution:\b/i,
    /\btherefore\b/i,
    /\bx\s*=\s*-?\d+(\.\d+)?\b/i,
    /\by\s*=\s*-?\d+(\.\d+)?\b/i,
  ];

  return patterns.some((re) => re.test(text));
}

export function validateTutorJSON(obj, studentMessage) {
  if (!obj || typeof obj !== "object") {
    return { ok: false, reason: "Response was not a JSON object." };
  }

  const { response_type, hint_level, content } = obj;

  if (!ALLOWED_TYPES.has(response_type)) {
    return { ok: false, reason: "Invalid response_type." };
  }

  if (!Number.isInteger(hint_level) || hint_level < 0 || hint_level > 4) {
    return { ok: false, reason: "hint_level must be 0–4." };
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    return { ok: false, reason: "content must be non-empty." };
  }

  const studentProposedAnswer =
    typeof studentMessage === "string" &&
    (/\b=\b/.test(studentMessage) || /\bmy answer\b/i.test(studentMessage) || /\bI got\b/i.test(studentMessage));

  if (!studentProposedAnswer && looksLikeFinalAnswerLeak(content)) {
    return { ok: false, reason: "Looks like full solution leak (Policy B)." };
  }

  return { ok: true };
}
