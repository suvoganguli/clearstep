function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {object} helpIntentPolicy
 * @param {string[]} [helpIntentPolicy.light_help_phrases]
 * @param {string[]} [helpIntentPolicy.full_help_phrases]
 */
export function detectHelpIntent(rawText, helpIntentPolicy) {
  const text = normalizeText(rawText);

  const lightPhrases = Array.isArray(helpIntentPolicy?.light_help_phrases)
    ? helpIntentPolicy.light_help_phrases
    : [];

  for (let i = 0; i < lightPhrases.length; i++) {
    const normalizedPhrase = normalizeText(lightPhrases[i]);
    if (text === normalizedPhrase) {
      return {
        isHelpIntent: true,
        helpType: "tutorial",
        helpStyle: "light",
        matchedPhrase: normalizedPhrase,
        normalizedText: text,
      };
    }
  }

  const fullPhrases = Array.isArray(helpIntentPolicy?.full_help_phrases)
    ? helpIntentPolicy.full_help_phrases
    : [];
  const normalizedFull = fullPhrases.map((phrase) => normalizeText(phrase));

  const matchedPhrase =
    normalizedFull.find((phrase) => text.includes(phrase)) || null;

  if (!matchedPhrase) {
    return {
      isHelpIntent: false,
      helpStyle: null,
      matchedPhrase: null,
      normalizedText: text,
    };
  }

  return {
    isHelpIntent: true,
    helpType: "tutorial",
    helpStyle: "full",
    matchedPhrase,
    normalizedText: text,
  };
}
