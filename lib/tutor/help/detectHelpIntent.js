function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectHelpIntent(rawText, helpIntentPolicy) {
  const text = normalizeText(rawText);

  const phrases = Array.isArray(helpIntentPolicy?.help_intent_phrases)
    ? helpIntentPolicy.help_intent_phrases
    : [];

  const normalizedPhrases = phrases.map((phrase) => normalizeText(phrase));

  const matchedPhrase =
    normalizedPhrases.find((phrase) => text.includes(phrase)) || null;

  if (!matchedPhrase) {
    return {
      isHelpIntent: false,
      matchedPhrase: null,
      normalizedText: text,
    };
  }

  return {
    isHelpIntent: true,
    helpType: "tutorial",
    matchedPhrase,
    normalizedText: text,
  };
}
