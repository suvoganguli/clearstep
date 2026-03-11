import OpenAI from "openai";
import { loadPolicyText } from "@/lib/policyLoader";
import { validateTutorJSON } from "@/lib/schemaValidator";

export async function generateTutorResponse({
  apiKey,
  model = "gpt-4o-mini",
  problem = "",
  studentMessage = "",
  history = [],
  intent,
  deterministic,
}) {
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const policyText = loadPolicyText();
  const recent = Array.isArray(history) ? history.slice(-10) : [];

  const system = `
You are ClearStep, a math coach for middle-school algebra.
Follow the policy exactly.

POLICY:
${policyText}

IMPORTANT:
- A deterministic checker evaluates algebra/arithmetic correctness.
- You MUST trust the checker output.
- Do NOT contradict it.
- Use the student's intent to decide whether to coach, confirm, or explain.
- Do not reveal the full solution unless the deterministic context clearly indicates the problem is solved.
- Reveal at most one step ahead.

OUTPUT RULES (MANDATORY):
- Output ONLY a single JSON object (no markdown).
- JSON keys: response_type, hint_level, content.
- response_type must be one of: QUESTION, HINT, FEEDBACK, REFUSAL.
- hint_level must be an integer 0..4.
- content must be short, clear, and coaching.
`.trim();

  const userPayload = {
    problem,
    studentMessage,
    intent,
    history: recent,
    deterministic,
  };

  const client = new OpenAI({ apiKey });

  let lastReason = "unknown";

  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";

    let obj = null;
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }

    const verdict = validateTutorJSON(obj, studentMessage);

    if (verdict.ok) return obj;

    lastReason = verdict.reason;
    userPayload.validation_error = lastReason;
  }

  throw new Error(`Tutor failed validation: ${lastReason}`);
}
