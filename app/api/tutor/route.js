import OpenAI from "openai";
import { loadPolicyText } from "@/lib/policyLoader";
import { validateTutorJSON } from "@/lib/schemaValidator";
import { normalizeEquationText } from "@/lib/algebra/common/textNormalize";

import { tryParseLinear, solveLinearFor, checkNextStepFor } from "@/lib/algebra/linear";

function buildDeterministicContext(problem, studentMessage) {
  try {
    const normalized = normalizeEquationText(problem || "");
    const { version, parsed } = tryParseLinear(normalized);

    const solved = solveLinearFor(version, parsed);
    const stepVerdict = checkNextStepFor(version, studentMessage || "", solved);

    console.log("NORMALIZED problem:", normalized);

    return {
      supported: true,
      version,
      parsed,
      solved,
      stepVerdict,
    };

  } catch (e) {
    return {
      supported: false,
      error: e?.message || "Unsupported problem format for Phase 1A.",
    };
  }
}

export async function POST(req) {

  console.log("MARK A: entered POST");

  try {
    const body = await req.json();
    const { problem, studentMessage, history } = body;

    console.log("MARK B: after body parse");
    console.log("API RECEIVED problem:", JSON.stringify(problem));

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    if (!apiKey) return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    const policyText = loadPolicyText();
    const recent = Array.isArray(history) ? history.slice(-10) : [];

    // Deterministic engine first
    console.log("MARK C1: before buildDeterministicContext");
    const det = buildDeterministicContext(problem || "", studentMessage || "");
    console.log("MARK C2: after buildDeterministicContext", det?.supported, det?.error, det?.version);

    const k = det?.stepVerdict?.kind;

    if (k === "STEP1_RESULT_CORRECT") {
      return Response.json({
        response_type: "FEEDBACK",
        hint_level: 1,
        content: `Nice. Now you have ${det.solved.a}x = ${det.solved.c - det.solved.b}. What should you do next to isolate x?`,
      });
    }

    if (k === "FINAL_CORRECT") {

      return Response.json({
        response_type: "DONE",
        hint_level: 0,
        content: "✅ Correct. Want to try a new problem?",
      });
    }


    const system = `
You are ClearStep, a math coach for middle-school algebra.
Follow the policy exactly.

POLICY:
${policyText}

IMPORTANT:
- A deterministic checker evaluates algebra/arithmetic correctness.
- You MUST trust the checker output.
- Do NOT contradict it.

OUTPUT RULES (MANDATORY):
- Output ONLY a single JSON object (no markdown).
- JSON keys: response_type, hint_level, content.
- response_type must be one of: QUESTION, HINT, FEEDBACK, REFUSAL.
- hint_level must be an integer 0..4.
- content must be short, clear, and coaching.
`.trim();

    const userPayload = {
      problem: problem || "",
      studentMessage: studentMessage || "",
      history: recent,
      deterministic: det,
    };

    // If unsupported, we can safely refuse (or ask for reformat)
    if (!det.supported) {
      return Response.json({
        response_type: "REFUSAL",
        hint_level: 0,
        content:
          "I can currently help with linear equations of the form ax + b = c where the solution for x is an integer (for example: 3x + 5 = 20). Please try another problem.",
      });
    }

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

      if (verdict.ok) return Response.json(obj);

      lastReason = verdict.reason;
      userPayload.validation_error = lastReason;
    }

    return Response.json({ error: `Tutor failed validation: ${lastReason}` }, { status: 500 });
} catch (error) {
  console.error("Tutor API error:", error);
  return Response.json(
    { error: error?.message || String(error) || "Server error" },
    { status: 500 }
  );
}
}
