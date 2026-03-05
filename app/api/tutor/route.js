import OpenAI from "openai";
import { loadPolicyText } from "@/lib/policyLoader";
import { validateTutorJSON } from "@/lib/schemaValidator";

import { parseAxPlusBEqualsC } from "@/lib/algebra/linearParser";
import { solveLinear, checkNextStep } from "@/lib/algebra/linearEngine";

function buildDeterministicContext(problem, studentMessage) {
  try {
    const parsedEq = parseAxPlusBEqualsC(problem);
    const solved = solveLinear(parsedEq);
    const stepVerdict = checkNextStep(studentMessage, solved);

    return {
      supported: true,
      parsed: parsedEq,
      solved: { a: solved.a, b: solved.b, c: solved.c, num: solved.num, x: solved.x },
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
  try {
    const body = await req.json();
    const { problem, studentMessage, history } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    if (!apiKey) return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    const policyText = loadPolicyText();
    const recent = Array.isArray(history) ? history.slice(-10) : [];

    const det = buildDeterministicContext(problem || "", studentMessage || "");

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
          "For the pilot, I can help with linear equations like 3x + 5 = 20 (integers only). Please rewrite the problem in that form.",
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
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
