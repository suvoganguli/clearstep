import {
  createProblemState,
  createProblemLog,
  processStudentTurn,
} from "@/lib/tutor";

export async function POST(req) {
  try {
    const body = await req.json();
    // Frontend skeleton sends: { input: string }
    // Older shape uses: { problem, studentMessage, state, history? }
    const input = body?.input;
    const problem = body?.problem ?? "3x + 5 = 20";
    const studentMessage = input ?? body?.studentMessage;
    const state = body?.state;

    let problemState = state;

    if (!problemState) {
      problemState = createProblemState(problem || "");
      createProblemLog(problemState);
    }

    const result = await processStudentTurn({
      problemState,
      studentText: studentMessage || "",
    });

    return Response.json({
      response: result.reply?.tutorText || "",
      content:
        result.reply?.tutorText || "I didn’t understand that. Try again.",
      status: result.reply?.status || "active",
      problemState: result.problemState,
      routeResult: result.routeResult,
      mathResult: result.mathResult,
      reply: result.reply,
    });
  } catch (err) {
    console.error("Tutor API error:", err);

    return Response.json(
      { response: "", error: err.message || "Server error" },
      { status: 500 },
    );
  }
}
