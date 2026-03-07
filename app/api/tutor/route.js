import OpenAI from "openai";
import { loadPolicyText } from "@/lib/policyLoader";
import { validateTutorJSON } from "@/lib/schemaValidator";
import { normalizeEquationText } from "@/lib/algebra/common/textNormalize";
import {
  canonicalizeLinearEquation,
  tryParseLinear,
  solveLinearFor,
  checkNextStepFor,
} from "@/lib/algebra/linear";
import { classifyStudentIntent } from "@/lib/tutor/classifyStudentIntent";

function buildDeterministicContext(problem, studentMessage) {
  try {
    const normalized = normalizeEquationText(problem || "");
    const canonical = canonicalizeLinearEquation(normalized);
    const { version, parsed } = tryParseLinear(canonical);
    const solved = solveLinearFor(version, parsed);
    const stepVerdict = checkNextStepFor(version, studentMessage || "", solved);

    console.log("NORMALIZED problem:", normalized);

    return {
      supported: true,
      version,
      parsed,
      solved,
      stepVerdict,
      canonical,
    };
  } catch (e) {
    return {
      supported: false,
      error: e?.message || "Unsupported problem format for Phase 1A.",
    };
  }
}

function formatAx(a) {
  if (a === 1) return "x";
  if (a === -1) return "-x";
  return `${a}x`;
}

function buildDeterministicResponse(det, intent) {
  const verdict = det?.stepVerdict;
  const solved = det?.solved;

  if (!verdict || !solved) return null;

  const axForm = `${formatAx(solved.a)} = ${solved.rhsAfterSubtract}`;

  switch (verdict.kind) {
    case "FINAL_CORRECT":
      return {
        response_type: "DONE",
        hint_level: 0,
        final_correct: true,
        content: "Correct. Want to try a new problem?",
      };

    case "FINAL_INCORRECT":
      return {
        response_type: "FEEDBACK",
        hint_level: 1,
        content: "Not quite. Check your arithmetic and solve for x carefully.",
      };

    case "STEP_CORRECT":
      if (verdict.stage === "ARITHMETIC_OK") {
        return {
          response_type: "FEEDBACK",
          hint_level: 1,
          content: `Nice. ${solved.rhsAfterSubtract} is correct. Now write the equation as ${axForm}.`,
        };
      }

      if (verdict.stage === "ISOLATED_AX") {
        return {
          response_type: "FEEDBACK",
          hint_level: 1,
          content: `Good. What operation will isolate x now?`,
        };
      }

      return {
        response_type: "FEEDBACK",
        hint_level: 1,
        content: "Good step. Keep going.",
      };

    case "STEP_INCORRECT":
      if (typeof verdict.expected === "number") {
        return {
          response_type: "HINT",
          hint_level: 2,
          content:
            "Check the result after combining the numbers on the right side.",
        };
      }

      return {
        response_type: "HINT",
        hint_level: 2,
        content: `Close, but that step is not correct. After simplifying, you should get ${axForm}.`,
      };

    case "STEP_HINT":
      if (verdict.stage === "SUBTRACT_B") {
      const isTentative = intent?.kind === "tentative_step";

      if (solved.b > 0) {
        return {
          response_type: "FEEDBACK",
          hint_level: 1,
          content: `Yes — subtract ${solved.b} from both sides.`,
        };
      }

      if (solved.b < 0) {
        return {
          response_type: "FEEDBACK",
          hint_level: 1,
          content: `Yes — add ${Math.abs(solved.b)} to both sides.`,
        };
      }

      return {
        response_type: "FEEDBACK",
        hint_level: 1,
        content: `Yes — there is no constant term to remove first.`,
      };
    }

      if (verdict.stage === "DIVIDE_BY_A") {
        return {
          response_type: "HINT",
          hint_level: 1,
          content: `Good. So what value does that give for x?`,
        };
      }

      if (verdict.stage === "DIVIDE_BY_WHAT") {
        return {
          response_type: "HINT",
          hint_level: 2,
          content: `Divide by the coefficient of x, which is ${solved.a}.`,
        };
      }

      return {
        response_type: "HINT",
        hint_level: 2,
        content: "Think about the operation that will isolate x.",
      };

    case "UNKNOWN":
      return {
        response_type: "QUESTION",
        hint_level: 1,
        content: "What is the next algebra step you want to take?",
      };

    default:
      return null;
  }
}

export async function POST(req) {
  console.log("MARK A: entered POST");

  try {
    const body = await req.json();
    const { problem, studentMessage, history } = body;
    const intent = classifyStudentIntent(studentMessage || "");

    const mathInput =
      intent.kind === "direct_step" || intent.kind === "tentative_step"
        ? intent.extractedStep || studentMessage || ""
        : "";

    console.log("MARK B: after body parse");
    console.log("API RECEIVED problem:", JSON.stringify(problem));

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const policyText = loadPolicyText();
    const recent = Array.isArray(history) ? history.slice(-10) : [];

    console.log("MARK C1: before buildDeterministicContext");
    const det = buildDeterministicContext(problem || "", mathInput);
    console.log(
      "MARK C2: after buildDeterministicContext",
      det?.supported,
      det?.error,
      det?.version,
    );

    if (!det.supported) {
      return Response.json({
        response_type: "REFUSAL",
        hint_level: 0,
        content:
          "I can currently help with linear equations of the form ax + b = c where the solution for x is an integer, for example 3x + 5 = 20.",
      });
    }

    // If the student already produced the final value, confirm without LLM
    if (
      intent.kind === "direct_step" &&
      typeof intent.extractedStep === "string" &&
      /^[+-]?\d+$/.test(intent.extractedStep)
    ) {
      const expected = det.solved?.solution;

      if (expected !== undefined && Number(intent.extractedStep) === expected) {
        return Response.json({
          response_type: "DONE",
          hint_level: 0,
          final_correct: true,
          content: `Yes — x = ${expected}. Great work.`,
        });
      }
    }

    const deterministicResponse = buildDeterministicResponse(det, intent);

    if (
      deterministicResponse &&
      det.stepVerdict?.kind !== "UNKNOWN" &&
      intent.kind !== "help_request" &&
      intent.kind !== "explanation_request"
    ) {
      return Response.json(deterministicResponse);
    }

    if (!apiKey) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 },
      );
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
      intent,
      history: recent,
      deterministic: det,
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

      if (verdict.ok) return Response.json(obj);

      lastReason = verdict.reason;
      userPayload.validation_error = lastReason;
    }

    return Response.json(
      { error: `Tutor failed validation: ${lastReason}` },
      { status: 500 },
    );
  } catch (error) {
    console.error("Tutor API error:", error);
    return Response.json(
      { error: error?.message || String(error) || "Server error" },
      { status: 500 },
    );
  }
}
