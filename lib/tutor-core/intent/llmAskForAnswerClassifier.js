function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Outcomes:
 * - { kind: "match", result } — usable ask_for_answer (phrase hit or LLM + threshold).
 * - { kind: "no_match" } — not ask_for_answer (regex bail-out, feature off, phrase miss + LLM unknown/low conf, etc.).
 * - { kind: "unavailable" } — phrase miss would use LLM but OPENAI_API_KEY is missing.
 * - { kind: "error" } — HTTP failure, missing content, JSON.parse failure, non-object JSON, or unexpected throw.
 */
export async function llmAskForAnswerClassifier(
  studentText,
  conversationalIntentConfig
) {
  const normalizedText = normalizeText(studentText);
  const proposedAnswerQuestionPatterns = [
    /^\s*is\s+x\s*=\s*[-+]?\d+\s*\??\s*$/i,
    /^\s*is\s+the\s+answer\s+[-+]?\d+\s*\??\s*$/i,
    /^\s*do\s+i\s+get\s+x\s*=\s*[-+]?\d+\s*\??\s*$/i,
  ];
  if (
    proposedAnswerQuestionPatterns.some((pattern) =>
      pattern.test(studentText || "")
    )
  ) {
    return { kind: "no_match" };
  }

  const askForAnswerConfig =
    conversationalIntentConfig?.intents?.ask_for_answer ?? null;

  if (!askForAnswerConfig?.enabled) {
    return { kind: "no_match" };
  }

  const phraseList = Array.isArray(askForAnswerConfig.phrases)
    ? askForAnswerConfig.phrases
    : [];
  const threshold =
    typeof askForAnswerConfig.confidence_threshold === "number"
      ? askForAnswerConfig.confidence_threshold
      : DEFAULT_CONFIDENCE_THRESHOLD;

  const matchedPhrase =
    phraseList
      .map((phrase) => normalizeText(phrase))
      .find((phrase) => normalizedText.includes(phrase)) || null;

  if (matchedPhrase) {
    return {
      kind: "match",
      result: {
        intent: "ask_for_answer",
        confidence: 1,
        matchedPhrase,
        rawText: studentText,
      },
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return { kind: "unavailable" };
  }

  const systemPrompt = `
You classify conversational intent for algebra tutoring.
Return ONLY JSON in this exact shape:
{
  "intent": "ask_for_answer" | "unknown",
  "confidence": number
}

Use "ask_for_answer" only when the student is explicitly asking for the final answer directly.
Otherwise return "unknown".

Classify as "unknown" when the student is proposing/checking an answer, including:
- "is x = 5?"
- "is the answer 5?"
- "do i get x = 5?"
`.trim();

  const userPrompt = `Student text:\n${studentText}`.trim();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      return { kind: "error" };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { kind: "error" };
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { kind: "error" };
    }

    if (!isPlainObject(parsed)) {
      return { kind: "error" };
    }

    const confidence =
      typeof parsed.confidence === "number" ? parsed.confidence : 0;
    const intent =
      parsed.intent === "ask_for_answer" ? "ask_for_answer" : "unknown";

    if (intent !== "ask_for_answer" || confidence < threshold) {
      return { kind: "no_match" };
    }

    return {
      kind: "match",
      result: {
        intent: "ask_for_answer",
        confidence,
        matchedPhrase: null,
        rawText: studentText,
      },
    };
  } catch {
    return { kind: "error" };
  }
}
