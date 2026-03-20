function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function llmConversationalIntentClassifier(
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
    return null;
  }
  const askForAnswerConfig =
    conversationalIntentConfig?.intents?.ask_for_answer ?? null;

  if (!askForAnswerConfig?.enabled) {
    return null;
  }

  const phraseList = Array.isArray(askForAnswerConfig.phrases)
    ? askForAnswerConfig.phrases
    : [];
  const threshold =
    typeof askForAnswerConfig.confidence_threshold === "number"
      ? askForAnswerConfig.confidence_threshold
      : 0.7;

  const matchedPhrase =
    phraseList
      .map((phrase) => normalizeText(phrase))
      .find((phrase) => normalizedText.includes(phrase)) || null;

  if (matchedPhrase) {
    return {
      intent: "ask_for_answer",
      confidence: 1,
      matchedPhrase,
      rawText: studentText,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return null;
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
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const confidence =
      typeof parsed?.confidence === "number" ? parsed.confidence : 0;
    const intent = parsed?.intent === "ask_for_answer" ? "ask_for_answer" : "unknown";

    if (intent !== "ask_for_answer" || confidence < threshold) {
      return null;
    }

    return {
      intent,
      confidence,
      matchedPhrase: null,
      rawText: studentText,
    };
  } catch {
    return null;
  }
}
