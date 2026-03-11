import { generateTutorResponse } from "@/lib/tutor/generateTutorResponse";
import { buildDeterministicContext } from "@/lib/tutor/buildDeterministicContext";
import { classifyStudentIntent } from "@/lib/tutor/classifyStudentIntent";
import { getMathInputFromIntent } from "@/lib/tutor/getMathInputFromIntent";
import { shouldBypassLLM } from "@/lib/tutor/shouldBypassLLM";
import { buildDeterministicResponse } from "@/lib/tutor/buildDeterministicResponse";

export async function POST(req) {
  console.log("MARK A: entered POST");

  try {
    const body = await req.json();
    const { problem, studentMessage, history } = body;
    const intent = classifyStudentIntent(studentMessage || "");

    const mathInput = getMathInputFromIntent(intent, studentMessage || "");

    console.log("MARK B: after body parse");
    console.log("API RECEIVED problem:", JSON.stringify(problem));

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

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

    const deterministicResponse = buildDeterministicResponse(det);

    if (shouldBypassLLM(det, intent, deterministicResponse)) {
      return Response.json(deterministicResponse);
    }

    const llmResponse = await generateTutorResponse({
      apiKey,
      model,
      problem: problem || "",
      studentMessage: studentMessage || "",
      history: recent,
      intent,
      deterministic: det,
    });

    return Response.json(llmResponse);
  } catch (error) {
    console.error("Tutor API error:", error);
    return Response.json(
      { error: error?.message || String(error) || "Server error" },
      { status: 500 },
    );
  }
}
