import {
  createProblemState,
  createProblemLog,
  processStudentTurn,
} from "@/lib/tutor";

export async function POST(req) {
  try {
    const body = await req.json();
    const { problem, studentMessage, state } = body;

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
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}
