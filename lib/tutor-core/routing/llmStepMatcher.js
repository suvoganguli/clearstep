const stepMatchCache = new Map();

/**
 * Outcomes:
 * - { kind: "match", match } — LLM returned a usable step (non-null stepType allowed by config).
 * - { kind: "no_match" } — LLM call succeeded and body parsed, but output is not usable as a step.
 * - { kind: "unavailable" } — no OPENAI_API_KEY.
 * - { kind: "error" } — HTTP failure, missing content, JSON.parse failure, or unexpected JSON shape.
 */

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Returns null if the model output is usable as a step type string, otherwise a reason string.
 * Precondition: parsed is a plain object.
 */
function unusableStepReason(parsed, allowedSteps) {
  const raw = parsed.stepType;
  if (raw === null || raw === undefined) {
    return "null_step_type";
  }
  if (typeof raw !== "string") {
    return "step_type_not_string";
  }
  const stepType = raw.trim();
  if (!stepType) {
    return "empty_step_type";
  }

  if (allowedSteps.length > 0 && !allowedSteps.includes(stepType)) {
    return "step_type_not_allowed";
  }

  return null;
}

export async function llmStepMatcher(studentText, stepsConfig) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return { kind: "unavailable" };
  }

  const CACHE_VERSION = "v3";

  const cacheKey =
    (studentText || "").trim().toLowerCase() + "::" + CACHE_VERSION;

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
- If unclear or the step is not valid algebraically, return stepType as null and confidence as a low value.
- Do not classify incorrect or nonsensical steps as valid step types.
- Examples of invalid steps:
  - "subtract 2x" when only one x-term should be moved
  - "divide by x"
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

    const reason = unusableStepReason(parsed, steps);
    if (reason !== null) {
      const outcome = { kind: "no_match" };
      stepMatchCache.set(cacheKey, outcome);
      return outcome;
    }

    const rawStepType = parsed.stepType;
    const stepType =
      typeof rawStepType === "string" ? rawStepType.trim() : rawStepType;

    const match = {
      source: "llm",
      stepType,
      valueRaw: parsed.valueRaw ?? null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      rawText: studentText,
    };

    const outcome = { kind: "match", match };

    stepMatchCache.set(cacheKey, outcome);

    return outcome;
  } catch {
    return { kind: "error" };
  }
}
