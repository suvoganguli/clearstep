const stepMatchCache = new Map();

export async function llmStepMatcher(studentText, stepsConfig) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return null;
  }

  const cacheKey = (studentText || "").trim().toLowerCase();

  if (stepMatchCache.has(cacheKey)) {
    return stepMatchCache.get(cacheKey);
  }

  const steps = Array.isArray(stepsConfig?.steps) ? stepsConfig.steps : [];

  const systemPrompt = `
You classify a student's algebra step into one canonical step type.

Return ONLY valid JSON with this exact shape:
{
  "stepType": "string or null",
  "valueRaw": "string or null",
  "confidence": number
}

Rules:
- Choose stepType only from the provided list.
- confidence must be between 0 and 1.
- valueRaw should contain the extracted numeric or symbolic value if present.
- If unclear, return stepType as null and confidence as a low value.
- Do not explain anything.
`.trim();

  const userPrompt = `
Student text:
${studentText}

Allowed step types:
${JSON.stringify(steps, null, 2)}
`.trim();

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

    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);

    const result = {
      source: "llm",
      stepType: parsed.stepType ?? null,
      valueRaw: parsed.valueRaw ?? null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      rawText: studentText,
    };

    stepMatchCache.set(cacheKey, result);

    return result;
  } catch {
    return null;
  }
}
